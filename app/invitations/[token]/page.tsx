"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldGroup, FieldLabel, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = { params: Promise<{ token: string }> };

export default function AcceptInvitationPage({ params }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const resolved = await params;
      if (email && password) {
        try {
          await api.login(email, password);
        } catch {
          await api.register(email, password);
        }
      }
      const result = await api.acceptInvite(resolved.token);
      await api.switchOrganization(result.organizationId);
      router.push("/org");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not accept invitation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join an organization</CardTitle>
          <CardDescription>Sign in with the invited email, then accept. If you have no account, one will be created.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup>
            <Field><FieldLabel htmlFor="email">Invited email</FieldLabel><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
            <Field><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
          </FieldGroup>
          {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <Button onClick={accept} loading={busy} disabled={!email || !password}>Accept invitation</Button>
          <Link className={buttonVariants({ variant: "ghost" })} href="/login">I already have an account</Link>
        </CardContent>
      </Card>
    </main>
  );
}
