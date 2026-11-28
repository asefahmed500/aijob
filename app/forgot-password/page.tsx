"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Brand } from "@/components/brand/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.forgotPassword(email);
      setSent(true);
      setDevToken(result.devToken ?? null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not request a reset link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <Card className="w-full max-w-md gap-0">
        <CardHeader className="gap-2 px-8 pt-10">
          <Brand size={28} />
          <CardTitle className="text-2xl">Forgot password?</CardTitle>
          <CardDescription>Enter your account email and we&apos;ll prepare a reset link.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-8 pb-10">
          <form onSubmit={submit} className="flex flex-col gap-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </Field>
            </FieldGroup>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Request failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" loading={busy} className="w-full">
              Send reset link <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
          {sent ? (
            <Alert>
              <AlertTitle>Reset link ready</AlertTitle>
              <AlertDescription>
                <p>If an account exists for that email, a reset link has been created.</p>
                {devToken ? (
                  <p className="mt-2">
                    Local development link:{" "}
                    <Link className="font-medium underline underline-offset-4" href={`/reset-password?token=${devToken}`}>
                      Open password reset
                    </Link>
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/login">
            <ArrowLeft data-icon="inline-start" /> Back to sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
