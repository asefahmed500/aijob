"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Quote, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Brand } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.register(email, password, name || undefined);
      router.push("/dashboard");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not reach the API");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl border bg-card lg:grid-cols-2">
        <aside className="hidden flex-col justify-between gap-12 border-r bg-muted/25 p-10 lg:flex">
          <Brand size={32} />
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-semibold tracking-tight">Start hiring with evidence.</h1>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Create a workspace, publish a role and review candidates against their own words.
            </p>
            <ul className="flex flex-col gap-3 pt-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-3"><Quote className="size-4 text-primary" /> Quoted resume evidence</li>
              <li className="flex items-center gap-3"><BadgeCheck className="size-4 text-primary" /> Clear hiring decisions</li>
              <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-primary" /> Isolated organizations</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">No credit card. No setup wizard.</p>
        </aside>

        <Card className="gap-0 rounded-none border-0 shadow-none">
          <CardHeader className="gap-2 px-8 pt-10 sm:px-10">
            <div className="lg:hidden"><Brand size={28} /></div>
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>Password must be at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10 sm:px-10">
            <form onSubmit={submit} className="flex flex-col gap-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </Field>
              </FieldGroup>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Registration failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" loading={busy} className="w-full">
                Create account <ArrowRight data-icon="inline-end" />
              </Button>
              <p className="text-sm text-muted-foreground">
                Already registered?{" "}
                <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
