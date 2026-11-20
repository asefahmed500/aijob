"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type ApplicationSummary, type EmailSource, type Evidence, type CoverLetter } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type Props = { params: Promise<{ id: string }> };

export default function WorkspacePage({ params }: Props) {
  const [id, setId] = useState<string | null>(null);
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationSummary | null>(null);
  const [emails, setEmails] = useState<EmailSource[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [rawEmail, setRawEmail] = useState("");
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (applicationId: string) => {
    try {
      const data = await api.getApplication(applicationId);
      setApplication(data);
      setEmails(data.emails);
      setEvidence(data.evidence);
      setLetter(data.letters[0] ?? null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        router.push("/login");
        return;
      }
      setError(cause instanceof ApiError ? cause.message : "Could not load application");
    }
  }, [router]);

  useEffect(() => {
    void params.then(async (resolved) => {
      setId(resolved.id);
      await refresh(resolved.id);
    });
  }, [params, refresh]);

  async function run(label: string, task: () => Promise<void>, after?: () => void) {
    if (!id) return;
    setBusy(true);
    setStatus(label);
    setError(null);
    try {
      await task();
      after?.();
      await refresh(id);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  function download(content: string, filename: string, contentType: string, base64: boolean) {
    const bytes = base64 ? Uint8Array.from(atob(content), (char) => char.charCodeAt(0)) : new TextEncoder().encode(content);
    const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!id) return <main className="flex flex-1 items-center justify-center">Loading…</main>;

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {application ? `${application.role} — ${application.company}` : "Workspace"}
          </h1>
          <p className="text-sm text-muted-foreground">Email → Evidence → Cover letter → Export</p>
        </div>

        {status ? <Alert><AlertTitle>Working</AlertTitle><AlertDescription>{status}</AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <Tabs defaultValue="emails">
          <TabsList>
            <TabsTrigger value="emails">1. Emails</TabsTrigger>
            <TabsTrigger value="evidence">2. Evidence</TabsTrigger>
            <TabsTrigger value="letter">3. Cover letter</TabsTrigger>
            <TabsTrigger value="export">4. Export</TabsTrigger>
          </TabsList>

          <TabsContent value="emails" className="flex flex-col gap-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Add source email</CardTitle>
                <CardDescription>Paste email text or upload a .txt / .eml file.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Textarea
                  value={rawEmail}
                  onChange={(event) => setRawEmail(event.target.value)}
                  placeholder={"Subject: Backend Engineer opportunity\n\nRequired skills include REST API design..."}
                  rows={8}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    type="file"
                    accept=".txt,.eml,.md"
                    className="max-w-xs"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) setRawEmail(await file.text());
                    }}
                  />
                  <Button
                    disabled={busy || rawEmail.trim().length < 10}
                    onClick={() => run("Adding email…", async () => { await api.addEmail(id, rawEmail); setRawEmail(""); })}
                  >
                    Add email
                  </Button>
                </div>
              </CardContent>
            </Card>

            {emails.map((email) => (
              <Card key={email.id}>
                <CardHeader>
                  <CardTitle className="text-base">{email.subject ?? "(no subject)"}</CardTitle>
                  <CardDescription>{email.fromAddress ?? "Pasted email"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{email.normalizedBody}</pre>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="evidence" className="flex flex-col gap-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Extract evidence</CardTitle>
                <CardDescription>Only quotes found verbatim in a source email are stored.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  disabled={busy || emails.length === 0}
                  onClick={() => run("Extracting evidence…", async () => {
                    const result = await api.extractEvidence(id);
                    setStatus(`${result.accepted} accepted, ${result.rejected} rejected${result.usedFallback ? " (deterministic fallback)" : ""}`);
                  })}
                >
                  Extract from {emails.length} email(s)
                </Button>
              </CardContent>
            </Card>

            {evidence.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">{item.claim}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.kind === "job_requirement" ? "default" : "secondary"}>{item.kind.replace("_", " ")}</Badge>
                      <Badge variant={item.approved ? "default" : "outline"}>{item.approved ? "approved" : "pending"}</Badge>
                    </div>
                  </div>
                  <CardDescription>Source: {item.emailSource?.subject ?? "unknown"} · method: {item.source}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">“{item.verbatimQuote}”</blockquote>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => run("Updating evidence…", async () => {
                        await api.reviewEvidence(item.id, !item.approved);
                      })}
                    >
                      {item.approved ? "Unapprove" : "Approve"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="letter" className="flex flex-col gap-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Generate cover letter</CardTitle>
                <CardDescription>Uses only approved evidence. Generation method is recorded on the letter.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={busy || evidence.filter((item) => item.approved).length === 0}
                  onClick={() => run("Generating letter…", async () => {
                    const created = await api.generateLetter(id);
                    setLetter(created);
                  })}
                >
                  Generate letter
                </Button>
                {letter ? <Badge variant="secondary">v{letter.version} · {letter.source}</Badge> : null}
              </CardContent>
            </Card>

            {letter ? (
              <>
                <Card>
                  <CardHeader><CardTitle>Letter</CardTitle></CardHeader>
                  <CardContent><pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed">{letter.content}</pre></CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Claim → evidence audit</CardTitle>
                    <CardDescription>Every factual sentence should point to an approved evidence item.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {(letter.claims ?? []).map((claim) => (
                      <div key={claim.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0">
                        <span className="flex-1 text-sm">{claim.sentence}</span>
                        <Badge variant={claim.grounded ? "default" : "destructive"}>
                          {claim.evidenceId ? "grounded" : "generic"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="export" className="flex flex-col gap-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Export channels</CardTitle>
                <CardDescription>Markdown, DOCX, print-to-PDF, clipboard and SMTP email.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {!letter ? <p className="text-sm text-muted-foreground">Generate a letter first.</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!letter || busy}
                    onClick={() => run("Preparing Markdown…", async () => {
                      const artifact = await api.produceExport(id, letter!.id, "markdown");
                      download(artifact.content, artifact.filename, artifact.contentType, artifact.base64);
                    })}
                  >
                    Markdown
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!letter || busy}
                    onClick={() => run("Preparing DOCX…", async () => {
                      const artifact = await api.produceExport(id, letter!.id, "docx");
                      download(artifact.content, artifact.filename, artifact.contentType, artifact.base64);
                    })}
                  >
                    DOCX
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!letter || busy}
                    onClick={() => run("Preparing print view…", async () => {
                      const artifact = await api.produceExport(id, letter!.id, "print");
                      const printWindow = window.open("", "_blank");
                      if (printWindow) {
                        printWindow.document.write(artifact.content);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    })}
                  >
                    Print / PDF
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!letter || busy}
                    onClick={() => run("Copying…", async () => {
                      const artifact = await api.produceExport(id, letter!.id, "clipboard");
                      await navigator.clipboard.writeText(artifact.content);
                      setStatus("Letter copied to clipboard");
                    })}
                  >
                    Copy text
                  </Button>
                </div>
                <Separator />
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="recipient">Send by email</FieldLabel>
                    <Input
                      id="recipient"
                      type="email"
                      value={recipient}
                      onChange={(event) => setRecipient(event.target.value)}
                      placeholder="recipient@example.com"
                    />
                  </Field>
                </FieldGroup>
                <Button
                  variant="secondary"
                  disabled={!letter || !recipient || busy}
                  onClick={() => run("Sending…", async () => {
                    await api.sendExport(id, letter!.id, recipient);
                    setStatus("Letter sent");
                  })}
                >
                  Send DOCX via SMTP
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
