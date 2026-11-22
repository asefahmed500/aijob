"use client";

import { RoleProvider } from "@/components/auth/role-context";

/**
 * Organization pages render inside the shared AppShell (sidebar + topbar).
 * This layout only supplies the active-tenant role used by page-level controls.
 */
export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <RoleProvider>{children}</RoleProvider>;
}
