"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Brand } from "@/components/brand/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not reset the password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <Card className="w-full max-w-md gap-0">
        <CardHeader className="gap-2 px-8 pt-10">
          <Brand size={28} />
          <CardTitle className="text-2xl">Choose a new password</CardTitle>
          <CardDescription>Use at least 8 characters for your new password.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-8 pb-10">
          {done ? (
            <>
              <Alert>
                <AlertTitle>Password updated</AlertTitle>
                <AlertDescription>You can now sign in with your new password.</AlertDescription>
              </Alert>
              <Link className={buttonVariants({ className: "w-full" })} href="/login">
                Sign in <ArrowRight data-icon="inline-end" />
              </Link>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="new-password">New password</FieldLabel>
                  <Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                  <Input id="confirm-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={8} />
                </Field>
              </FieldGroup>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Reset failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" loading={busy} disabled={!token} className="w-full">
                Reset password <ArrowRight data-icon="inline-end" />
              </Button>
              {!token ? <p className="text-xs text-muted-foreground">This link is missing a reset token.</p> : null}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
