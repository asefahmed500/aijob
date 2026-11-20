"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Membership {
  organizationId: string;
  role: string;
  organization: { id: string; name: string; slug: string };
}

export default function OrgOverviewPage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [current, setCurrent] = useState<{ name: string; _count: { jobs: number; candidates: number } } | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [orgs, active] = await Promise.all([api.listOrganizations(), api.currentOrganization()]);
      setMemberships(orgs);
      setCurrent(active);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load organizations");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const org = await api.createOrganization(name);
      await api.switchOrganization(org.id);
      setName("");
      await load();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create organization");
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
          <p className="text-sm text-muted-foreground">Each organization has isolated jobs, candidates and scores.</p>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        {current ? (
          <Card>
            <CardHeader>
              <CardTitle>{current.name}</CardTitle>
              <CardDescription>Currently active organization</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Badge variant="secondary">{current._count.jobs} jobs</Badge>
              <Badge variant="secondary">{current._count.candidates} candidates</Badge>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Create organization</CardTitle>
            <CardDescription>You become the owner of the new tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-wrap items-end gap-4">
              <FieldGroup className="flex-1">
                <Field>
                  <FieldLabel htmlFor="org-name">Name</FieldLabel>
                  <Input id="org-name" value={name} onChange={(event) => setName(event.target.value)} required />
                </Field>
              </FieldGroup>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          {memberships.map((membership) => (
            <Card key={membership.organizationId}>
              <CardContent className="flex items-center justify-between pt-6">
                <span className="font-medium">{membership.organization.name}</span>
                <Badge variant="outline">{membership.role}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
