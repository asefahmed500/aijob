"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrgMembership {
  organizationId: string;
  role: string;
  organization: { id: string; name: string };
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [current, setCurrent] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [orgs, active] = await Promise.all([
        api.listOrganizations(),
        api.currentOrganization(),
      ]);
      setMemberships(orgs);
      setCurrent(active);
    } catch {
      // The child page displays its own API errors.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function switchOrg(organizationId: string) {
    await api.switchOrganization(organizationId);
    await load();
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold">aijob org</span>
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/org">Overview</Link>
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/org/jobs">Jobs</Link>
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/org/candidates">Candidates</Link>
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/dashboard">My applications</Link>
          </div>
          {memberships.length > 0 ? (
            <Select value={current?.id ?? memberships[0].organizationId} onValueChange={(value) => void switchOrg(String(value))}>
              <SelectTrigger className="w-56">
                <SelectValue>{current?.name ?? memberships[0].organization.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {memberships.map((membership) => (
                    <SelectItem key={membership.organizationId} value={membership.organizationId}>
                      {membership.organization.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}
