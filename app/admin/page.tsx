"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/brand/logo";

interface Overview {
  totals: Record<string, number>;
}
interface OrgRow {
  id: string;
  name: string;
  slug: string;
  members: number;
  jobs: number;
  candidates: number;
  roles: string[];
}
interface UserRow {
  id: string;
  email: string;
  name: string | null;
  systemRole: string;
  organizations: number;
}
interface AuditRow {
  id: string;
  type: string;
  message: string;
  organization: string;
  createdAt: string;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [organizations, setOrganizations] = useState<OrgRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const me = await api.me();
      if (me.systemRole !== "PLATFORM_ADMIN") {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
      const [summary, orgs, people, events] = await Promise.all([
        api.adminOverview(),
        api.adminOrganizations(),
        api.adminUsers(),
        api.adminAudit(),
      ]);
      setOverview(summary);
      setOrganizations(orgs);
      setUsers(people);
      setAudit(events);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 403
          ? "Platform admin access is required."
          : cause instanceof Error ? cause.message : "Could not load admin data",
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeRole(user: UserRow, systemRole: "USER" | "PLATFORM_ADMIN") {
    setBusyId(user.id);
    setError(null);
    try {
      await api.setSystemRole(user.id, systemRole);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update role");
    } finally {
      setBusyId(null);
    }
  }

  if (!loaded) {
    return <main className="flex flex-1 items-center justify-center px-6 py-16">Loading…</main>;
  }

  if (!isAdmin) {
    return (
      <main className="flex flex-1 flex-col px-6 py-10">
        <div className="mx-auto w-full max-w-2xl">
          <Alert variant="destructive">
            <AlertTitle>Access denied</AlertTitle>
            <AlertDescription>{error ?? "Platform admin access is required."}</AlertDescription>
          </Alert>
          <Link className={`${buttonVariants({ variant: "outline" })} mt-4`} href="/org">Back to organization</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Platform admin</h1>
              <p className="text-sm text-muted-foreground">Cross-tenant overview and access control.</p>
            </div>
          </div>
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/org">Organization workspace</Link>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {overview
                ? Object.entries(overview.totals).map(([label, value]) => (
                    <Card key={label}>
                      <CardHeader>
                        <CardDescription className="capitalize">{label}</CardDescription>
                        <CardTitle className="text-2xl">{value}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))
                : null}
            </div>
          </TabsContent>

          <TabsContent value="organizations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>All tenants on this platform.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Jobs</TableHead>
                      <TableHead>Candidates</TableHead>
                      <TableHead>Roles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.members}</TableCell>
                        <TableCell>{row.jobs}</TableCell>
                        <TableCell>{row.candidates}</TableCell>
                        <TableCell className="flex flex-wrap gap-1">
                          {row.roles.map((role) => <Badge key={role} variant="outline">{role}</Badge>)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Users and platform roles</CardTitle>
                <CardDescription>Platform admins bypass tenant scoping; organization roles still apply.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Organizations</TableHead>
                      <TableHead>Platform role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.email}</TableCell>
                        <TableCell>{row.name ?? "—"}</TableCell>
                        <TableCell>{row.organizations}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={row.systemRole}
                              onValueChange={(value) => {
                                if (value === "USER" || value === "PLATFORM_ADMIN") void changeRole(row, value);
                              }}
                            >
                              <SelectTrigger className="w-44"><SelectValue>{row.systemRole}</SelectValue></SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="USER">USER</SelectItem>
                                  <SelectItem value="PLATFORM_ADMIN">PLATFORM_ADMIN</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            {busyId === row.id ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity across tenants</CardTitle>
                <CardDescription>Most recent 50 events.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.organization}</TableCell>
                        <TableCell><Badge variant="outline">{row.type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{row.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
