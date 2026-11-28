"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type PublicJob, type ScreeningResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = { params: Promise<{ token: string }> };

export default function PublicApplyPage({ params }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [job, setJob] = useState<PublicJob | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [screening, setScreening] = useState<ScreeningResult | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (applyToken: string) => {
    setError(null);
    try {
      const detail = await api.getPublicJob(applyToken);
      setJob(detail);
      setAnswers(
        Object.fromEntries(detail.formFields.map((field) => [field.id, ""])),
      );
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 404
        ? "This application link is invalid."
        : cause instanceof Error ? cause.message : "Could not load this job");
    }
  }, []);

  useEffect(() => {
    void params.then(async (resolved) => {
      setToken(resolved.token);
      await load(resolved.token);
    });
  }, [params, load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.publicApply(token, { name, email, resumeText, answers });
      setSubmittedId(created.applicationId);
      setScreening(created.screening);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 400
        ? cause.message
        : cause instanceof Error ? cause.message : "Could not submit application");
    } finally {
      setBusy(false);
    }
  }

  if (!token) return <main className="flex flex-1 items-center justify-center">Loading…</main>;

  const closed = job?.status === "closed" || job?.status === "expired";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        {job ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{job.company}</Badge>
                <Badge variant={job.status === "expired" ? "destructive" : "outline"}>{job.status}</Badge>
                {job.autoScreen ? <Badge variant="outline">AI-screened</Badge> : null}
              </div>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription>Review the role before applying.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {job.formExpiresAt ? (
                <p className="text-xs text-muted-foreground">
                  This form accepts applications until {new Date(job.formExpiresAt).toLocaleString()}.
                </p>
              ) : null}
              <div>
                <h2 className="text-sm font-semibold">About the role</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold">What we are looking for</h2>
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {job.requirements.split(/\n|;/).map((line) => line.trim()).filter(Boolean).map((line, index) => (
                    <li key={index}>{line.replace(/^[-*•\d.]+\s*/, "")}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Apply for this role</CardTitle>
            <CardDescription>
              Your answers and resume text are screened by AI against the job requirements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {job?.status === "expired" ? (
              <Alert variant="destructive">
                <AlertTitle>Link expired</AlertTitle>
                <AlertDescription>The application link has expired. Ask the employer for a new link.</AlertDescription>
              </Alert>
            ) : job?.status === "closed" ? (
              <Alert>
                <AlertTitle>Role closed</AlertTitle>
                <AlertDescription>This job is no longer accepting applications.</AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field><FieldLabel htmlFor="name">Full name</FieldLabel><Input id="name" value={name} onChange={(event) => setName(event.target.value)} required /></Field>
                  <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
                  {job?.formFields.map((field) => (
                    <Field key={field.id}>
                      <FieldLabel htmlFor={`answer-${field.id}`}>{field.label}{field.required ? " *" : ""}</FieldLabel>
                      {field.type === "textarea" ? (
                        <Textarea
                          id={`answer-${field.id}`}
                          value={answers[field.id] ?? ""}
                          onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))}
                          placeholder={field.placeholder || undefined}
                          required={field.required}
                          rows={4}
                          maxLength={5000}
                        />
                      ) : (
                        <Input
                          id={`answer-${field.id}`}
                          type={field.type === "url" ? "url" : "text"}
                          value={answers[field.id] ?? ""}
                          onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))}
                          placeholder={field.placeholder || undefined}
                          required={field.required}
                          maxLength={5000}
                        />
                      )}
                    </Field>
                  ))}
                  <Field>
                    <FieldLabel htmlFor="resume">Resume text</FieldLabel>
                    <Textarea id="resume" value={resumeText} onChange={(event) => setResumeText(event.target.value)} required minLength={20} rows={10} />
                  </Field>
                </FieldGroup>
                {error ? <Alert variant="destructive"><AlertTitle>Submission failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
                <Button type="submit" loading={busy} disabled={closed}>Submit application</Button>
              </form>
            )}
            {submittedId ? (
              <Alert className="mt-4">
                <AlertTitle>Application submitted</AlertTitle>
                <AlertDescription>
                  <p>Application {submittedId} was received for {job?.title}.</p>
                  {screening ? (
                    <p className="mt-2">
                      AI screening: <strong>{screening.score}% match</strong> ({screening.source}). {screening.summary}
                    </p>
                  ) : (
                    <p className="mt-2">The employer will review and score your application.</p>
                  )}
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
