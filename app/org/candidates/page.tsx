"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type CandidateSearchRow } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";

interface JobOption {
  id: string;
  title: string;
}
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrgRole } from "@/components/auth/role-context";

const STAGES = ["new", "screening", "interview", "offer", "rejected"];

export default function CandidatesPage() {
  const [rows, setRows] = useState<CandidateSearchRow[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [jobId, setJobId] = useState("");
  const [sort, setSort] = useState("score");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStage, setBulkStage] = useState("screening");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { canWrite } = useOrgRole();
  const [creatingCandidate, setCreatingCandidate] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [bulking, setBulking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [search, openJobs] = await Promise.all([
        api.searchCandidates({
          q,
          stage: stage && stage !== "all" ? stage : undefined,
          jobId: jobId && jobId !== "all" ? jobId : undefined,
          sort,
        }),
        api.listJobs(),
      ]);
      setRows(search);
      setJobs(openJobs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not search candidates");
    }
  }, [q, stage, jobId, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCreatingCandidate(true);
    try {
      await api.createCandidate(name, email, resumeText);
      setName("");
      setEmail("");
      setResumeText("");
      setStatus("Candidate added");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add candidate");
    } finally {
      setCreatingCandidate(false);
    }
  }

  async function apply(candidateId: string) {
    const target = jobId && jobId !== "all" ? jobId : jobs[0]?.id;
    if (!target) return;
    setError(null);
    setApplyingId(candidateId);
    try {
      await api.applyCandidate(candidateId, target);
      setStatus("Candidate applied to job");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not apply candidate");
    } finally {
      setApplyingId(null);
    }
  }

  async function runBulk() {
    const ids = selected.filter((id) => rows.some((row) => row.application?.id === id));
    if (ids.length === 0) return;
    setError(null);
    setBulking(true);
    try {
      await api.bulkStage(ids, bulkStage);
      setStatus(`${ids.length} candidates moved to ${bulkStage}`);
      setSelected([]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bulk update failed");
    } finally {
      setBulking(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
          <p className="text-sm text-muted-foreground">Search, filter, bulk-move stages and open candidate detail.</p>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {status ? <Alert><AlertTitle>Done</AlertTitle><AlertDescription>{status}</AlertDescription></Alert> : null}

        <Card>
          <CardHeader><CardTitle>Search and filter</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <Field>
              <FieldLabel htmlFor="q">Name or email</FieldLabel>
              <Input id="q" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search…" />
            </Field>
            <Field>
              <FieldLabel htmlFor="stage-filter">Stage</FieldLabel>
              <Select value={stage} onValueChange={(value) => setStage(String(value))}>
                <SelectTrigger className="w-40"><SelectValue>All stages</SelectValue></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="all">All stages</SelectItem>
                  {STAGES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="job-filter">Job</FieldLabel>
              <Select value={jobId} onValueChange={(value) => setJobId(String(value))}>
                <SelectTrigger className="w-48"><SelectValue>All jobs</SelectValue></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="all">All jobs</SelectItem>
                  {jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>)}
                </SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="sort">Sort</FieldLabel>
              <Select value={sort} onValueChange={(value) => setSort(String(value))}>
                <SelectTrigger className="w-40"><SelectValue>{sort}</SelectValue></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="score">Score</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="recent">Recent</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Bulk stage change</CardTitle><CardDescription>{selected.length} candidates selected.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <Select value={bulkStage} onValueChange={(value) => setBulkStage(String(value))}>
              <SelectTrigger className="w-44"><SelectValue>{bulkStage}</SelectValue></SelectTrigger>
              <SelectContent><SelectGroup>{STAGES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            <Button onClick={runBulk} loading={bulking} disabled={selected.length === 0 || !canWrite}>Move selected</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Add candidate</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-col gap-4">
              <FieldGroup>
                <Field><FieldLabel htmlFor="name">Name</FieldLabel><Input id="name" value={name} onChange={(event) => setName(event.target.value)} required /></Field>
                <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
                <Field><FieldLabel htmlFor="resume">Resume text</FieldLabel><Textarea id="resume" value={resumeText} onChange={(event) => setResumeText(event.target.value)} required minLength={20} rows={6} /></Field>
              </FieldGroup>
              <Button type="submit" loading={creatingCandidate} disabled={!canWrite}>Add candidate</Button>
            </form>
          </CardContent>
        </Card>

        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div className="flex items-center gap-3">
                <Checkbox
                  aria-label={`Select ${row.name}`}
                  checked={row.application ? selected.includes(row.application.id) : false}
                  disabled={!row.application || !canWrite}
                  onCheckedChange={(checked) => {
                    if (!row.application) return;
                    setSelected((current) =>
                      checked
                        ? [...current, row.application!.id]
                        : current.filter((item) => item !== row.application!.id),
                    );
                  }}
                />
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{row.name}</span>
                  <CardDescription>{row.email} · {row.source}</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{row.application?.score ?? 0}% match</Badge>
                <Badge variant="outline">{row.application?.stage ?? "unapplied"}</Badge>
                <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={`/org/candidates/${row.id}`}>Open</Link>
                <Button size="sm" variant="outline" onClick={() => apply(row.id)} loading={applyingId === row.id} disabled={!canWrite}>Apply</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
