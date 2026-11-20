"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type CandidateDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const STAGES = ["new", "screening", "interview", "offer", "rejected"];
type Props = { params: Promise<{ id: string }> };

export default function CandidateDetailPage({ params }: Props) {
  const [id, setId] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [notes, setNotes] = useState<Array<{ id: string; body: string; createdAt: string }>>([]);
  const [timeline, setTimeline] = useState<Array<{ id: string; type: string; message: string; createdAt: string }>>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState("new");
  const [rating, setRating] = useState("3");

  const load = useCallback(async (candidateId: string) => {
    try {
      const record = await api.getCandidate(candidateId);
      setCandidate(record);
      if (record.applications[0]) setStage(record.applications[0].stage);
      if (record.applications[0]) {
        const [noteList, events] = await Promise.all([
          api.getNotes(record.applications[0].id),
          api.getTimeline(record.applications[0].id),
        ]);
        setNotes(noteList);
        setTimeline(events);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load candidate");
    }
  }, []);

  useEffect(() => {
    void params.then(async (resolved) => {
      setId(resolved.id);
      await load(resolved.id);
    });
  }, [params, load]);

  async function updateStage() {
    const application = candidate?.applications[0];
    if (!application) return;
    setError(null);
    try {
      await api.updateStage(application.id, stage, Number(rating));
      await load(id!);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update stage");
    }
  }

  async function submitNote(event: React.FormEvent) {
    event.preventDefault();
    const application = candidate?.applications[0];
    if (!application) return;
    setError(null);
    try {
      await api.addNote(application.id, note);
      setNote("");
      await load(id!);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add note");
    }
  }

  if (!id) return <main className="flex flex-1 items-center justify-center">Loading…</main>;

  const application = candidate?.applications[0];

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{candidate?.name ?? "Candidate"}</h1>
          <p className="text-sm text-muted-foreground">{candidate?.email} · source: {candidate?.source}</p>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <Card>
          <CardHeader><CardTitle>Resume</CardTitle></CardHeader>
          <CardContent><pre className="whitespace-pre-wrap text-sm text-muted-foreground">{candidate?.resumeText}</pre></CardContent>
        </Card>

        {application ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Hiring pipeline</CardTitle>
                <CardDescription>{application.job.title} · current stage: {application.stage}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <FieldGroup className="flex flex-wrap gap-3">
                  <Field>
                    <FieldLabel htmlFor="stage">Stage</FieldLabel>
                    <Select value={stage} onValueChange={(value) => setStage(String(value))}>
                      <SelectTrigger className="w-44"><SelectValue>{stage}</SelectValue></SelectTrigger>
                      <SelectContent><SelectGroup>{STAGES.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}</SelectGroup></SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="rating">Rating</FieldLabel>
                    <Input id="rating" type="number" min={1} max={5} value={rating} onChange={(event) => setRating(event.target.value)} className="w-24" />
                  </Field>
                </FieldGroup>
                <Button onClick={updateStage}>Update stage</Button>
                <Badge variant="secondary">{application.scores[0]?.score ?? 0}% match</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Notes</CardTitle><CardDescription>Internal, org-scoped recruiter notes.</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-4">
                <form onSubmit={submitNote} className="flex flex-col gap-3">
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note…" required />
                  <Button type="submit" size="sm" className="w-fit">Add note</Button>
                </form>
                {notes.map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">{item.body}</div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Activity timeline</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {timeline.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0">
                    <span className="text-sm">{item.message}</span>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );
}
