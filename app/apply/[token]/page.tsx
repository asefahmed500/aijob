"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = { params: Promise<{ token: string }> };

export default function PublicApplyPage({ params }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const resolved = await params;
      const created = await api.publicApply(resolved.token, { name, email, resumeText });
      setResult(`Application ${created.applicationId} submitted for ${created.jobTitle}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit application");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Public application</Badge>
          <CardTitle>Apply for this role</CardTitle>
          <CardDescription>Your resume text is used as the source for quoted evidence in the recruiter ranking.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <FieldGroup>
              <Field><FieldLabel htmlFor="name">Full name</FieldLabel><Input id="name" value={name} onChange={(event) => setName(event.target.value)} required /></Field>
              <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
              <Field>
                <FieldLabel htmlFor="resume">Resume text</FieldLabel>
                <Textarea id="resume" value={resumeText} onChange={(event) => setResumeText(event.target.value)} required minLength={20} rows={10} />
              </Field>
            </FieldGroup>
            {error ? <Alert variant="destructive"><AlertTitle>Submission failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            {result ? <Alert><AlertTitle>Submitted</AlertTitle><AlertDescription>{result}</AlertDescription></Alert> : null}
            <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit application"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
