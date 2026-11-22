"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type CandidateDetail } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrgRole } from "@/components/auth/role-context";

const STAGES = ["new", "screening", "interview", "offer", "hired", "rejected"];
type Props = { params: Promise<{ id: string }> };

export default function CandidateDetailPage({ params }: Props) {
  const [id, setId] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Array<{ id: string; body: string; createdAt: string }>>([]);
  const [timeline, setTimeline] = useState<Array<{ id: string; type: string; message: string; createdAt: string }>>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [stage, setStage] = useState("new");
  const [rating, setRating] = useState("3");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { canWrite } = useOrgRole();

  const loadActivity = useCallback(async (applicationId: string) => {
    const [noteList, events] = await Promise.all([
      api.getNotes(applicationId),
      api.getTimeline(applicationId),
    ]);
    setNotes(noteList);
    setTimeline(events);
  }, []);

  const load = useCallback(async (candidateId: string, preferredAppId?: string) => {
    try {
      const record = await api.getCandidate(candidateId);
      setCandidate(record);
      const chosen =
        record.applications.find((item) => item.id === preferredAppId) ?? record.applications[0] ?? null;
      setSelectedAppId(chosen?.id ?? null);
      if (chosen) {
        setStage(chosen.stage);
        await loadActivity(chosen.id);
      } else {
        setNotes([]);
        setTimeline([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load candidate");
    }
  }, [loadActivity]);

  useEffect(() => {
    void params.then(async (resolved) => {
      setId(resolved.id);
      await load(resolved.id);
    });
  }, [params, load]);

  const application = candidate?.applications.find((item) => item.id === selectedAppId) ?? null;
  const cv = candidate?.cvs[0] ?? null;

  async function selectApplication(applicationId: string) {
    setSelectedAppId(applicationId);
    const chosen = candidate?.applications.find((item) => item.id === applicationId);
    if (chosen) setStage(chosen.stage);
    await loadActivity(applicationId);
  }

  async function updateStage() {
    if (!application || !id) return;
    setBusy("stage");
    setError(null);
    try {
      await api.updateStage(application.id, stage, Number(rating));
      setStatus("Stage updated and the candidate was notified.");
      await load(id, application.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update stage");
    } finally {
      setBusy(null);
    }
  }

  async function submitNote(event: React.FormEvent) {
    event.preventDefault();
    if (!application || !id) return;
    setBusy("note");
    setError(null);
    try {
      await api.addNote(application.id, note);
      setNote("");
      await load(id, application.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add note");
    } finally {
      setBusy(null);
    }
  }

  async function decide(decision: "offer" | "reject" | "hire") {
    if (!application || !id) return;
    setBusy(decision);
    setError(null);
    try {
      const result = await api.decideApplication(application.id, decision, decisionMessage || undefined);
      setStatus(`${decision} recorded (${result.status}). Notification: ${result.notificationStatus}.`);
      setDecisionMessage("");
      await load(id, application.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not record decision");
    } finally {
      setBusy(null);
    }
  }

  async function generateCv() {
    if (!id) return;
    setBusy("cv");
    setError(null);
    try {
      const generated = await api.generateCv(id);
      setStatus(`CV version ${generated.version} generated (${generated.source}).`);
      await load(id, application?.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate CV");
    } finally {
      setBusy(null);
    }
  }

  if (!id) return <main className="flex flex-1 items-center justify-center">Loading…</main>;

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{candidate?.name ?? "Candidate"}</h1>
            <p className="text-sm text-muted-foreground">{candidate?.email} · source: {candidate?.source}</p>
          </div>
          {application ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{application.stage}</Badge>
              <Badge variant="secondary">{application.status}</Badge>
            </div>
          ) : null}
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {status ? <Alert><AlertTitle>Done</AlertTitle><AlertDescription>{status}</AlertDescription></Alert> : null}

        {candidate && candidate.applications.length > 1 ? (
          <Card>
            <CardHeader><CardTitle>Applications</CardTitle><CardDescription>Select the job whose pipeline you are managing.</CardDescription></CardHeader>
            <CardContent>
              <Select value={selectedAppId ?? ""} onValueChange={(value) => void selectApplication(String(value))}>
                <SelectTrigger className="w-72"><SelectValue>Choose an application</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {candidate.applications.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.job.title} · {item.stage}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>AI CV</CardTitle>
            <CardDescription>Structured, printable CV built only from the candidate&apos;s resume text.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {cv ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{cv.headline}</span>
                  <Badge variant="secondary">v{cv.version}</Badge>
                  <Badge variant="outline">{cv.source}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{cv.summary}</p>
                {cv.skills ? <p className="text-sm"><span className="font-semibold">Skills: </span>{cv.skills.split("\n").join(" · ")}</p> : null}
                {cv.experience ? <p className="whitespace-pre-wrap text-sm">{cv.experience}</p> : null}
                {cv.education ? <p className="whitespace-pre-wrap text-sm">{cv.education}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/org/candidates/${id}/cv`}>
                    Open printable CV
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => void generateCv()} loading={busy === "cv"} disabled={!canWrite}>
                    Regenerate CV
                  </Button>
                </div>
              </>
            ) : (
              <Button variant="soft" onClick={() => void generateCv()} loading={busy === "cv"} disabled={!canWrite}>
                Generate AI CV
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Resume</CardTitle><CardDescription>Original text submitted by the candidate.</CardDescription></CardHeader>
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
                <Button onClick={() => void updateStage()} loading={busy === "stage"} disabled={!canWrite}>
                  Update stage
                </Button>
                <Badge variant="secondary">{application.scores[0]?.score ?? 0}% match</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hiring decision</CardTitle>
                <CardDescription>Records the outcome, updates status and notifies the candidate.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="decision-message">Message to candidate (optional)</FieldLabel>
                  <Textarea
                    id="decision-message"
                    value={decisionMessage}
                    onChange={(event) => setDecisionMessage(event.target.value)}
                    placeholder="Leave blank to use the standard message for this decision."
                    rows={3}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void decide("offer")} loading={busy === "offer"} disabled={busy !== null || !canWrite}>Send offer</Button>
                  <Button size="sm" variant="destructive" onClick={() => void decide("reject")} loading={busy === "reject"} disabled={busy !== null || !canWrite}>Reject</Button>
                  <Button size="sm" variant="secondary" onClick={() => void decide("hire")} loading={busy === "hire"} disabled={busy !== null || !canWrite}>Mark hired</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Notes</CardTitle><CardDescription>Internal, org-scoped recruiter notes.</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-4">
                <form onSubmit={submitNote} className="flex flex-col gap-3">
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note…" required />
                  <Button type="submit" size="sm" className="w-fit" loading={busy === "note"} disabled={!canWrite}>Add note</Button>
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
