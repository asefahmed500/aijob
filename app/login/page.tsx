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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@aijob.local");
  const [password, setPassword] = useState("demo12345");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
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
            <h1 className="text-3xl font-semibold tracking-tight">Hiring, grounded in evidence.</h1>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              One clear workspace to post roles, review candidates and make decisions you can explain.
            </p>
            <ul className="flex flex-col gap-3 pt-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-3"><Quote className="size-4 text-primary" /> Verbatim source quotes</li>
              <li className="flex items-center gap-3"><BadgeCheck className="size-4 text-primary" /> Transparent scoring</li>
              <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-primary" /> Role-scoped access</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">Traceable hiring for modern teams.</p>
        </aside>

        <Card className="gap-0 rounded-none border-0 shadow-none">
          <CardHeader className="gap-2 px-8 pt-10 sm:px-10">
            <div className="lg:hidden"><Brand size={28} /></div>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Welcome back. Enter your credentials to continue.</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10 sm:px-10">
            <form onSubmit={submit} className="flex flex-col gap-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </Field>
              </FieldGroup>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign in failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" loading={busy} className="w-full">
                Sign in <ArrowRight data-icon="inline-end" />
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  No account?{" "}
                  <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/register">Register</Link>
                </span>
                <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/forgot-password">
                  Forgot password?
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
