"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CandidateSummary {
  id: string;
  name: string;
  email: string;
  _count: { applications: number };
}
interface JobOption {
  id: string;
  title: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [people, openJobs] = await Promise.all([api.listCandidates(), api.listJobs()]);
      setCandidates(people);
      setJobs(openJobs);
      if (openJobs.length > 0 && !selectedJob) setSelectedJob(openJobs[0].id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load candidates");
    }
  }, [selectedJob]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.createCandidate(name, email, resumeText);
      setName("");
      setEmail("");
      setResumeText("");
      setStatus("Candidate added");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add candidate");
    }
  }

  async function apply(candidateId: string) {
    if (!selectedJob) return;
    setError(null);
    try {
      await api.applyCandidate(candidateId, selectedJob);
      setStatus("Candidate applied to job");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not apply candidate");
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
          <p className="text-sm text-muted-foreground">Add a resume, apply it to a job, then score from the job page.</p>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {status ? <Alert><AlertTitle>Done</AlertTitle><AlertDescription>{status}</AlertDescription></Alert> : null}

        <Card>
          <CardHeader>
            <CardTitle>Add candidate</CardTitle>
            <CardDescription>The resume text is the source for score evidence quotes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-col gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="candidate-name">Name</FieldLabel>
                  <Input id="candidate-name" value={name} onChange={(event) => setName(event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="candidate-email">Email</FieldLabel>
                  <Input id="candidate-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="candidate-resume">Resume text</FieldLabel>
                  <Textarea id="candidate-resume" value={resumeText} onChange={(event) => setResumeText(event.target.value)} required minLength={20} rows={8} />
                </Field>
              </FieldGroup>
              <Button type="submit">Add candidate</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apply to a job</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <Select value={selectedJob} onValueChange={(value) => setSelectedJob(String(value))}>
              <SelectTrigger className="w-64">
                <SelectValue>{jobs.find((job) => job.id === selectedJob)?.title ?? "Select a job"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">Use the Apply button on each candidate below.</span>
          </CardContent>
        </Card>

        {candidates.map((candidate) => (
          <Card key={candidate.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div className="flex flex-col gap-1">
                <span className="font-medium">{candidate.name}</span>
                <CardDescription>{candidate.email}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{candidate._count.applications} applications</Badge>
                <Button size="sm" variant="outline" disabled={!selectedJob} onClick={() => apply(candidate.id)}>
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
