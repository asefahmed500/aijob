"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, type ApplicationSummary } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setApplications(await api.listApplications());
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        router.push("/login");
        return;
      }
      setError(cause instanceof ApiError ? cause.message : "Could not load applications");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await api.createApplication(company, role);
      router.push(`/applications/${created.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not create application");
    }
  }

  async function logout() {
    await api.logout();
    router.push("/login");
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
            <p className="text-sm text-muted-foreground">Each application follows the same four-step workflow.</p>
          </div>
          <Button variant="outline" onClick={logout}>Sign out</Button>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>New application</CardTitle>
            <CardDescription>Start from a job posting email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-wrap items-end gap-4">
              <FieldGroup className="flex flex-1 flex-wrap gap-4">
                <Field className="flex-1">
                  <FieldLabel htmlFor="company">Company</FieldLabel>
                  <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
                </Field>
                <Field className="flex-1">
                  <FieldLabel htmlFor="role">Role</FieldLabel>
                  <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} required />
                </Field>
              </FieldGroup>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>

        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

        <div className="flex flex-col gap-3">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{application.role} — {application.company}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{application._count.emails} emails</Badge>
                    <Badge variant="secondary">{application._count.evidence} evidence</Badge>
                    <Badge variant="secondary">{application._count.letters} letters</Badge>
                  </div>
                </div>
                <Link className={buttonVariants({ variant: "outline" })} href={`/applications/${application.id}`}>
                  Open workspace
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
