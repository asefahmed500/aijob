"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type FormField } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrgRole } from "@/components/auth/role-context";

interface JobSummary {
  id: string;
  title: string;
  status: string;
  publicToken: string | null;
  formFields: string | null;
  formExpiresAt: string | null;
  autoScreen: boolean;
  _count: { applications: number };
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseFields(raw: string | null): FormField[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FormField[]) : [];
  } catch {
    return [];
  }
}

function makeField(): FormField {
  return {
    id: `field_${Math.random().toString(36).slice(2, 9)}`,
    label: "",
    type: "text",
    required: false,
    placeholder: "",
  };
}

function FormFieldsEditor({
  fields,
  onChange,
  disabled,
}: {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  disabled: boolean;
}) {
  function update(index: number, patch: Partial<FormField>) {
    onChange(fields.map((field, position) => (position === index ? { ...field, ...patch } : field)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Application questions</p>
          <p className="text-sm text-muted-foreground">
            Extra questions shown on the public form, like a Google Form. Name, email and resume are always included.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={disabled || fields.length >= 20}
          onClick={() => onChange([...fields, makeField()])}>
          Add question
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No extra questions yet. Add one if you need specific information from applicants.</p>
      ) : null}
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
          <Field className="min-w-48 flex-1">
            <FieldLabel htmlFor={`field-label-${field.id}`}>Question {index + 1}</FieldLabel>
            <Input
              id={`field-label-${field.id}`}
              value={field.label}
              onChange={(event) => update(index, { label: event.target.value })}
              placeholder="e.g. Link to your GitHub profile"
              maxLength={120}
              required
              disabled={disabled}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`field-type-${field.id}`}>Answer type</FieldLabel>
            <Select value={field.type} onValueChange={(value) => update(index, { type: value as FormField["type"] })} disabled={disabled}>
              <SelectTrigger id={`field-type-${field.id}`} className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="text">Short text</SelectItem>
                <SelectItem value="textarea">Long text</SelectItem>
                <SelectItem value="url">URL</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field className="min-w-48 flex-1">
            <FieldLabel htmlFor={`field-placeholder-${field.id}`}>Hint (optional)</FieldLabel>
            <Input
              id={`field-placeholder-${field.id}`}
              value={field.placeholder}
              onChange={(event) => update(index, { placeholder: event.target.value })}
              placeholder="Shown under the question"
              maxLength={200}
              disabled={disabled}
            />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Checkbox
              aria-label={`Question ${index + 1} required`}
              checked={field.required}
              onCheckedChange={(checked) => update(index, { required: checked === true })}
              disabled={disabled}
            />
            Required
          </label>
          <Button type="button" size="sm" variant="ghost" disabled={disabled}
            onClick={() => onChange(fields.filter((_, position) => position !== index))}>
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [brief, setBrief] = useState("");
  const [draftSource, setDraftSource] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [autoScreen, setAutoScreen] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<FormField[]>([]);
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editAutoScreen, setEditAutoScreen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [now, setNow] = useState(0);
  const { canWrite, orgRole } = useOrgRole();

  useEffect(() => {
    setOrigin(window.location.origin);
    setNow(Date.now());
  }, []);

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
      await api.createJob(title, description, requirements, draftSource ?? undefined, {
        formFields: fields,
        formExpiresAt: fromLocalInput(expiresAt),
        autoScreen,
      });
      setTitle("");
      setDescription("");
      setRequirements("");
      setBrief("");
      setDraftSource(null);
      setFields([]);
      setExpiresAt("");
      setStatus("Job created. Copy its public link below and send it to candidates.");
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

  async function copyLink(token: string | null) {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(`${origin}/apply/${token}`);
      setStatus("Public application link copied to clipboard.");
    } catch {
      setError(`Copy this link manually: ${origin}/apply/${token}`);
    }
  }

  function startEdit(job: JobSummary) {
    setEditingJobId(job.id);
    setEditFields(parseFields(job.formFields));
    setEditExpiresAt(toLocalInput(job.formExpiresAt));
    setEditAutoScreen(job.autoScreen);
  }

  async function saveForm(job: JobSummary) {
    setBusyId(job.id);
    setError(null);
    try {
      await api.updateJobForm(job.id, {
        formFields: editFields,
        formExpiresAt: fromLocalInput(editExpiresAt),
        autoScreen: editAutoScreen,
      });
      setStatus("Public form settings saved.");
      setEditingJobId(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save form settings");
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
            Build a public application form, send its link to candidates, and let AI screen every response.
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
            <CardTitle>New job and public form</CardTitle>
            <CardDescription>
              One requirement per line for the clearest scoring.
              {draftSource ? <Badge className="ml-2" variant="secondary">AI draft: {draftSource}</Badge> : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-col gap-5">
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

              <FormFieldsEditor fields={fields} onChange={setFields} disabled={!canWrite || creating} />

              <div className="flex flex-wrap items-end gap-4">
                <Field>
                  <FieldLabel htmlFor="job-expires">Link expires at (optional)</FieldLabel>
                  <Input
                    id="job-expires"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                    disabled={!canWrite || creating}
                  />
                </Field>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <Checkbox
                    aria-label="Screen applications with AI automatically"
                    checked={autoScreen}
                    onCheckedChange={(checked) => setAutoScreen(checked === true)}
                    disabled={!canWrite || creating}
                  />
                  AI-screen each submission automatically
                </label>
              </div>

              <Button type="submit" loading={creating} disabled={!canWrite}>Create job and form</Button>
            </form>
          </CardContent>
        </Card>

        {jobs.map((job) => {
          const link = job.publicToken ? `${origin}/apply/${job.publicToken}` : "";
          const expired = Boolean(job.formExpiresAt && now && new Date(job.formExpiresAt).getTime() <= now);
          return (
            <Card key={job.id}>
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{job.title}</span>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{job._count.applications} candidates</Badge>
                      <Badge variant="outline">{job.status}</Badge>
                      {expired ? <Badge variant="destructive">link expired</Badge> : null}
                      <Badge variant="outline">{parseFields(job.formFields).length} form questions</Badge>
                      <Badge variant="outline">auto-screen {job.autoScreen ? "on" : "off"}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void copyLink(job.publicToken)} disabled={!link}>
                      Copy public link
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(job)} loading={busyId === job.id} disabled={!canWrite}>
                      {job.status === "open" ? "Close job" : "Reopen job"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(job)} disabled={!canWrite}>
                      Edit form &amp; link
                    </Button>
                    <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/org/jobs/${job.id}`}>
                      View ranking
                    </Link>
                  </div>
                </div>
                {link ? <p className="break-all text-xs text-muted-foreground">{link}</p> : null}

                {editingJobId === job.id ? (
                  <div className="flex flex-col gap-4 rounded-md border bg-muted/20 p-4">
                    <FormFieldsEditor fields={editFields} onChange={setEditFields} disabled={!canWrite} />
                    <div className="flex flex-wrap items-end gap-4">
                      <Field>
                        <FieldLabel htmlFor={`edit-expires-${job.id}`}>Link expires at</FieldLabel>
                        <Input
                          id={`edit-expires-${job.id}`}
                          type="datetime-local"
                          value={editExpiresAt}
                          onChange={(event) => setEditExpiresAt(event.target.value)}
                        />
                      </Field>
                      <label className="flex items-center gap-2 pb-2 text-sm">
                        <Checkbox
                          aria-label={`Auto-screen ${job.title}`}
                          checked={editAutoScreen}
                          onCheckedChange={(checked) => setEditAutoScreen(checked === true)}
                        />
                        AI-screen each submission automatically
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void saveForm(job)} loading={busyId === job.id}>Save settings</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingJobId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
