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
  const [error, setError] = useState<string | null>(null);

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

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.createJob(title, description, requirements);
      setTitle("");
      setDescription("");
      setRequirements("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create job");
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">Define requirements; candidates are scored against them.</p>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <Card>
          <CardHeader>
            <CardTitle>New job</CardTitle>
            <CardDescription>One requirement per line for the clearest scoring.</CardDescription>
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
              <Button type="submit">Create job</Button>
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
              <Link className={buttonVariants({ variant: "outline" })} href={`/org/jobs/${job.id}`}>
                View ranking
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
