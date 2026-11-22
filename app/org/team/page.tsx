"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Member, type Invitation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useOrgRole } from "@/components/auth/role-context";

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [myRole, setMyRole] = useState<string>("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("RECRUITER");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { canWrite, isOwner } = useOrgRole();
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [team, roleInfo] = await Promise.all([api.getTeam(), api.getMyRole()]);
      setMembers(team.members);
      setInvitations(team.invitations);
      setMyRole(roleInfo.role);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load team");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInviting(true);
    try {
      const created = await api.inviteMember(email, role);
      setStatus(`Invitation created. Token: ${created.token}`);
      setEmail("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not invite member");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(userId: string, nextRole: string) {
    setError(null);
    try {
      await api.updateMemberRole(userId, nextRole);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change role");
    }
  }

  async function remove(userId: string) {
    setError(null);
    setRemovingId(userId);
    try {
      await api.removeMember(userId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove member");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">Your role: {myRole || "loading"}</p>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {status ? <Alert><AlertTitle>Invitation ready</AlertTitle><AlertDescription>{status}</AlertDescription></Alert> : null}

        {canWrite ? (
          <Card>
            <CardHeader><CardTitle>Invite a teammate</CardTitle><CardDescription>The invitee signs in with the same email, then accepts the token.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={invite} className="flex flex-wrap items-end gap-4">
                <FieldGroup className="flex flex-wrap gap-4">
                  <Field><FieldLabel htmlFor="invite-email">Email</FieldLabel><Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
                  <Field>
                    <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                    <Select value={role} onValueChange={(value) => setRole(String(value))}>
                      <SelectTrigger className="w-44"><SelectValue>{role}</SelectValue></SelectTrigger>
                      <SelectContent><SelectGroup>
                        <SelectItem value="RECRUITER">RECRUITER</SelectItem>
                        <SelectItem value="VIEWER">VIEWER</SelectItem>
                      </SelectGroup></SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
                <Button type="submit" loading={inviting}>Invite</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader><CardTitle>Members</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-2 last:border-b-0">
                <div className="flex flex-col">
                  <span className="font-medium">{member.user.name ?? member.user.email}</span>
                  <span className="text-sm text-muted-foreground">{member.user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{member.role}</Badge>
                  {isOwner && member.role !== "OWNER" ? (
                    <>
                      <Select value={member.role} onValueChange={(value) => changeRole(member.id, String(value))}>
                        <SelectTrigger className="w-36"><SelectValue>{member.role}</SelectValue></SelectTrigger>
                        <SelectContent><SelectGroup>
                          <SelectItem value="RECRUITER">RECRUITER</SelectItem>
                          <SelectItem value="VIEWER">VIEWER</SelectItem>
                        </SelectGroup></SelectContent>
                      </Select>
                      <Button size="sm" variant="destructive" onClick={() => remove(member.id)} loading={removingId === member.id}>Remove</Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pending invitations</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {invitations.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No pending invitations</EmptyTitle>
                  <EmptyDescription>Invite a teammate to see them here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0">
                <span className="text-sm">{invitation.email}</span>
                <Badge variant="outline">{invitation.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
