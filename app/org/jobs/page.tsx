"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrgRole } from "@/components/auth/role-context";

interface JobSummary {
  id: string;
  title: string;
  status: string;
  _count: { applications: number };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [brief, setBrief] = useState("");
  const [draftSource, setDraftSource] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { canWrite, orgRole } = useOrgRole();

  const load = useCallback(async () => {
    try {
      setJobs(await api.listJobs());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load jobs");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function draft(event: React.FormEvent) {
    event.preventDefault();
    setDrafting(true);
    setError(null);
    setStatus(null);
    try {
      const result = await api.generateJobDraft(brief);
      setTitle(result.title);
      setDescription(result.description);
      setRequirements(result.requirements);
      setDraftSource(result.source);
      setStatus(`Draft ready (${result.source}). Review it before creating the job.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not draft job post");
    } finally {
      setDrafting(false);
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createJob(title, description, requirements, draftSource ?? undefined);
      setTitle("");
      setDescription("");
      setRequirements("");
      setBrief("");
      setDraftSource(null);
      setStatus("Job created. Candidates can now apply through its public link.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create job");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(job: JobSummary) {
    setBusyId(job.id);
    setError(null);
    try {
      await api.updateJobStatus(job.id, job.status === "open" ? "closed" : "open");
      setStatus(`Job ${job.status === "open" ? "closed" : "reopened"}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update job status");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Draft with AI, publish a public apply link, and close the role when hiring is done.
          </p>
          {orgRole ? <Badge variant="outline" className="w-fit">Your role: {orgRole}</Badge> : null}
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {status ? <Alert><AlertTitle>Done</AlertTitle><AlertDescription>{status}</AlertDescription></Alert> : null}

        <Card>
          <CardHeader>
            <CardTitle>Draft a job post with AI</CardTitle>
            <CardDescription>Describe the role in a few lines; the draft is filled into the form below for review.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={draft} className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="job-brief">Hiring brief</FieldLabel>
                <Textarea
                  id="job-brief"
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder="Senior Backend Engineer&#10;NestJS APIs, PostgreSQL schema design, JWT authentication"
                  required
                  minLength={10}
                  rows={4}
                />
              </Field>
              <Button type="submit" variant="soft" loading={drafting} disabled={!canWrite}>
                Draft with AI
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New job</CardTitle>
            <CardDescription>
              One requirement per line for the clearest scoring.
              {draftSource ? <Badge className="ml-2" variant="secondary">AI draft: {draftSource}</Badge> : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-col gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="job-title">Title</FieldLabel>
                  <Input id="job-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="job-desc">Description</FieldLabel>
                  <Textarea id="job-desc" value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="job-req">Requirements</FieldLabel>
                  <Textarea id="job-req" value={requirements} onChange={(event) => setRequirements(event.target.value)} required minLength={10} rows={6} />
                </Field>
              </FieldGroup>
              <Button type="submit" loading={creating} disabled={!canWrite}>Create job</Button>
            </form>
          </CardContent>
        </Card>

        {jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div className="flex flex-col gap-1">
                <span className="font-medium">{job.title}</span>
                <div className="flex gap-2">
                  <Badge variant="secondary">{job._count.applications} candidates</Badge>
                  <Badge variant="outline">{job.status}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleStatus(job)}
                  loading={busyId === job.id}
                  disabled={!canWrite}
                >
                  {job.status === "open" ? "Close job" : "Reopen job"}
                </Button>
                <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/org/jobs/${job.id}`}>
                  View ranking
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
