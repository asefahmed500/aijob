"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { api, type User } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Logo } from "@/components/brand/logo";

const PUBLIC_PREFIXES = ["/login", "/register", "/apply", "/invitations"];

const workspaceNav = [
  { label: "Overview", href: "/org", icon: LayoutDashboard },
  { label: "Jobs", href: "/org/jobs", icon: BriefcaseBusiness },
  { label: "Candidates", href: "/org/candidates", icon: Users },
  { label: "Analytics", href: "/org/analytics", icon: BarChart3 },
  { label: "Notifications", href: "/org/notifications", icon: Bell },
  { label: "Team", href: "/org/team", icon: Settings2 },
];

const pageTitles: Record<string, string> = {
  "/org": "Overview",
  "/org/jobs": "Jobs",
  "/org/candidates": "Candidates",
  "/org/analytics": "Analytics",
  "/org/notifications": "Notifications",
  "/org/team": "Team",
  "/dashboard": "My applications",
  "/admin": "Platform admin",
};

interface OrgOption {
  organizationId: string;
  role: string;
  organization: { id: string; name: string };
}

function isPublic(pathname: string) {
  return pathname === "/" || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Shared authenticated shell: collapsible sidebar + topbar + main content. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [activeOrg, setActiveOrg] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, memberships, roleInfo, current] = await Promise.all([
        api.me(),
        api.listOrganizations(),
        api.getMyRole().catch(() => ({ role: "" })),
        api.currentOrganization().catch(() => null),
      ]);
      setUser(me);
      setOrgs(memberships as OrgOption[]);
      setActiveOrg(current?.id ?? memberships[0]?.organizationId ?? null);
      setOrgRole(roleInfo.role || (me.systemRole === "PLATFORM_ADMIN" ? "ADMIN" : "MEMBER"));
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    if (isPublic(pathname)) return;
    setAuthChecked(false);
    void load();
  }, [pathname, load]);

  // A protected URL opened directly must not leave the visitor on a shell
  // that leaks the route name while its API calls fail with 401.
  useEffect(() => {
    if (!isPublic(pathname) && authChecked && !user) {
      router.replace("/login");
    }
  }, [pathname, authChecked, user, router]);

  async function switchOrg(organizationId: string) {
    await api.switchOrganization(organizationId);
    await load();
    router.refresh();
  }

  async function signOut() {
    await api.logout();
    router.push("/login");
  }

  if (isPublic(pathname)) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {authChecked ? "Redirecting to sign in…" : "Loading…"}
      </main>
    );
  }

  const isAdmin = user?.systemRole === "PLATFORM_ADMIN";
  const canWrite = isAdmin || orgRole === "OWNER" || orgRole === "RECRUITER";
  const title =
    pageTitles[pathname] ??
    (pathname.startsWith("/applications") ? "Application workspace" : "Workspace");
  const currentPage = pathname.split("/").filter(Boolean).pop() ?? "Workspace";

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <SidebarMenuButton render={<DropdownMenuTrigger />}>
                    <Logo size={22} />
                    <span className="font-semibold tracking-tight">aijob</span>
                    <ChevronDown className="ml-auto" />
                  </SidebarMenuButton>
                  <DropdownMenuContent align="start" className="w-60">
                    <DropdownMenuGroup>
                    <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                      {orgs.length === 0 ? (
                        <DropdownMenuItem disabled>No organizations yet</DropdownMenuItem>
                      ) : (
                        orgs.map((org) => (
                          <DropdownMenuItem key={org.organizationId} onClick={() => void switchOrg(org.organizationId)}>
                            <span className="flex flex-1 flex-col">
                              <span>{org.organizationId === activeOrg ? "Active · " : ""}{org.organization.name}</span>
                              <span className="text-xs text-muted-foreground">{org.role}</span>
                            </span>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem render={<Link href="/org" />}>Manage organizations</DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {workspaceNav.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={pathname === item.href}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.href === "/org/jobs" || item.href === "/org/candidates" ? (
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<Link href={item.href} />}>
                              {item.href === "/org/jobs" ? "All jobs" : "All candidates"}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton render={<Link href={item.href} />}>
                              {item.href === "/org/jobs" ? "New job" : "Add candidate"}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      ) : null}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Personal</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link href="/dashboard" />} isActive={pathname === "/dashboard"}>
                      <FileText />
                      <span>My applications</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link href="/dashboard" />}>
                      <Sparkles />
                      <span>Cover letters</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin ? (
              <SidebarGroup>
                <SidebarGroupLabel>Administration</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<Link href="/admin" />} isActive={pathname === "/admin"}>
                        <ShieldCheck />
                        <span>Platform admin</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge>ADMIN</SidebarMenuBadge>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}

            <SidebarSeparator />
            <SidebarGroup className="px-3 py-2">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>Role: {orgRole ?? "MEMBER"}</span>
                <span>{canWrite ? "Full access" : "Read-only access"}</span>
              </div>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <SidebarMenuButton render={<DropdownMenuTrigger />}>
                    <div className="flex size-6 items-center justify-center rounded bg-primary text-xs font-semibold text-primary-foreground">
                      {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{user?.name ?? user?.email ?? "Account"}</span>
                    <ChevronDown className="ml-auto" />
                  </SidebarMenuButton>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuGroup>
                    <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                      <DropdownMenuItem render={<Link href="/dashboard" />}>My applications</DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/org" />}>Organization</DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => void signOut()}>
                        <LogOut />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            <SidebarTrigger />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href="/org" />}>Workspace</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
                {currentPage.toLowerCase() !== title.toLowerCase() ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem><BreadcrumbPage className="text-muted-foreground">{currentPage}</BreadcrumbPage></BreadcrumbItem>
                  </>
                ) : null}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              {orgRole ? <Badge variant="outline">{orgRole}</Badge> : null}
              {canWrite ? (
                <Link className={buttonVariants({ size: "sm" })} href="/org/jobs">
                  <Plus data-icon="inline-start" />
                  New job
                </Link>
              ) : null}
            </div>
          </header>
          <div className="flex flex-1 flex-col overflow-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
