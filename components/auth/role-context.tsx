"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface RoleContextValue {
  orgRole: string | null;
  systemRole: string | null;
  isAdmin: boolean;
  canWrite: boolean;
  isOwner: boolean;
  loading: boolean;
}

const defaults: RoleContextValue = {
  orgRole: null,
  systemRole: null,
  isAdmin: false,
  canWrite: false,
  isOwner: false,
  loading: true,
};

const RoleContext = createContext<RoleContextValue>(defaults);

/** Supplies the active tenant role and the platform role to org pages. */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [systemRole, setSystemRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([api.getMyRole(), api.me()]).then(([role, me]) => {
      if (!active) return;
      if (role.status === "fulfilled") setOrgRole(role.value.role);
      if (me.status === "fulfilled") setSystemRole(me.value.systemRole);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const isAdmin = systemRole === "PLATFORM_ADMIN";
  const value: RoleContextValue = {
    orgRole,
    systemRole,
    isAdmin,
    canWrite: isAdmin || orgRole === "OWNER" || orgRole === "RECRUITER",
    isOwner: isAdmin || orgRole === "OWNER",
    loading,
  };
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useOrgRole(): RoleContextValue {
  return useContext(RoleContext);
}
