import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  FileCheck2,
  FileText,
  Filter,
  LayoutDashboard,
  LockKeyhole,
  Quote,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Brand } from "@/components/brand/brand";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Sparkles,
    title: "AI job drafts",
    body: "Turn a short brief into a clear, reviewable role post before anything is published.",
  },
  {
    icon: ScanSearch,
    title: "Quoted evidence",
    body: "Every match points to a verbatim line from the candidate's own resume or answers.",
  },
  {
    icon: FileText,
    title: "Structured CVs",
    body: "Generate a clean, printable CV from submitted resume text and keep every version.",
  },
  {
    icon: Bell,
    title: "Decision trail",
    body: "Offer, reject or hire with a recorded message and a searchable notification log.",
  },
  {
    icon: LockKeyhole,
    title: "Scoped access",
    body: "Owners, recruiters and viewers see only what their role and active organization allow.",
  },
  {
    icon: FileCheck2,
    title: "No invented claims",
    body: "Outputs are labelled by source so generated content and fallbacks stay distinguishable.",
  },
];

const steps = [
  {
    title: "Describe the role",
    body: "Draft a job post and add the questions candidates should answer. Share one public link.",
  },
  {
    title: "Collect applications",
    body: "Responses and resumes arrive in one place. Required answers are checked before submission.",
  },
  {
    title: "Decide with proof",
    body: "Rank candidates against quoted evidence, leave notes, then record the outcome.",
  },
];

const previewRows = [
  { name: "Candidate A", role: "Backend Engineer", evidence: "Built REST APIs with JWT authentication" },
  { name: "Candidate B", role: "Backend Engineer", evidence: "Designed PostgreSQL schemas and indexes" },
  { name: "Candidate C", role: "Backend Engineer", evidence: "Integrated an external AI service" },
];

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
      {children}
    </Link>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-sm">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3"
        >
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" aria-label="Joby home" className="flex shrink-0 items-center">
              <Brand size={30} />
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              <NavLink href="#product">Product</NavLink>
              <NavLink href="#workflow">Workflow</NavLink>
              <NavLink href="#evidence">Why evidence</NavLink>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/login">
              Sign in
            </Link>
            <Link className={buttonVariants({ size: "sm" })} href="/register">
              Get started <ArrowRight data-icon="inline-end" />
            </Link>
          </div>
        </nav>
      </header>

      <section className="border-b">
        <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div className="flex min-w-0 flex-col items-start">
            <Badge variant="secondary" className="gap-2">
              <Sparkles className="size-3.5" />
              Evidence-grounded hiring workspace
            </Badge>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl lg:text-[3.4rem]">
              Hiring, grounded in evidence.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Post a role, collect applications and rank candidates against their own words.
              Every decision stays traceable, reviewable and human-controlled.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className={buttonVariants({ size: "lg" })} href="/register">
                Start hiring <ArrowRight data-icon="inline-end" />
              </Link>
              <Link className={buttonVariants({ variant: "outline", size: "lg" })} href="#workflow">
                See how it works
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="size-3.5 text-primary" /> Verbatim source quotes</li>
              <li className="flex items-center gap-2"><Check className="size-3.5 text-primary" /> Role-based access</li>
              <li className="flex items-center gap-2"><Check className="size-3.5 text-primary" /> No fabricated claims</li>
            </ul>
          </div>

          <Card className="min-w-0 gap-0 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="ml-3 truncate text-xs text-muted-foreground">app.joby.dev / candidates</span>
              <Badge variant="outline" className="ml-auto hidden text-[10px] sm:inline-flex">Preview</Badge>
            </div>
            <div className="flex min-h-80">
              <aside className="hidden w-36 shrink-0 flex-col gap-1 border-r bg-muted/25 p-3 sm:flex">
                <div className="flex items-center gap-2 px-2 py-2">
                  <Logo size={18} />
                  <span className="text-xs font-semibold">Joby</span>
                </div>
                <Separator className="my-2" />
                {[
                  { icon: LayoutDashboard, label: "Overview" },
                  { icon: BriefcaseBusiness, label: "Jobs" },
                  { icon: Users, label: "Candidates" },
                ].map((item, index) => (
                  <span
                    key={item.label}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2 text-[11px]",
                      index === 2 ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="size-3.5" />
                    {item.label}
                  </span>
                ))}
              </aside>
              <CardContent className="min-w-0 flex-1 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Workspace</p>
                    <p className="text-base font-semibold">Candidate ranking</p>
                  </div>
                  <Badge variant="secondary" className="gap-1 text-[10px]"><Filter className="size-3" /> Ranked</Badge>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {previewRows.map((row) => (
                    <div key={row.name} className="min-w-0 rounded-md border p-3">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium">{row.name}</span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">quoted evidence</Badge>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">{row.role}</p>
                      <div className="mt-2 flex items-start gap-2 border-l-2 pl-2 text-[11px] italic text-muted-foreground">
                        <Quote className="mt-0.5 size-3 shrink-0" />
                        <span className="line-clamp-2">{row.evidence}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">Illustrative preview — not live data.</p>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      <section id="product" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Product</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">One workspace, from job post to decision.</h2>
          <p className="mt-3 text-base text-muted-foreground">
            Built for teams that want a clear record of why every candidate moved forward.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="transition-colors hover:bg-muted/30">
              <CardHeader>
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <feature.icon className="size-4" />
                </div>
                <CardTitle className="mt-3 text-base">{feature.title}</CardTitle>
                <CardDescription className="leading-relaxed">{feature.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y bg-muted/25">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Three steps, no guesswork.</h2>
          </div>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="relative min-w-0">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-sm font-semibold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  {index < steps.length - 1 ? (
                    <ChevronRight className="ml-auto hidden size-4 text-muted-foreground md:block" aria-hidden="true" />
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="evidence" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Why evidence</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">A score means more when you can read the proof.</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Joby stores the exact excerpt behind every match and checks that generated claims
              come from confirmed source text. Unsupported statements are flagged for review,
              never presented as fact.
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-sm">
              {["Quotes are verbatim substrings of the source", "AI and deterministic outputs are labelled", "Candidate and recruiter actions stay auditable"].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Requirement → source excerpt</CardTitle>
              <CardDescription>Illustrative example of a traceable match.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Requirement</p>
                <p className="mt-1 text-sm">REST API design and authentication</p>
              </div>
              <div className="flex justify-center text-muted-foreground" aria-hidden="true">
                <ArrowRight className="size-4 rotate-90" />
              </div>
              <div className="rounded-md border p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Verbatim quote</p>
                <blockquote className="mt-1 border-l-2 pl-3 text-sm italic text-muted-foreground">
                  “Built a REST API in NestJS with JWT authentication.”
                </blockquote>
                <Badge variant="secondary" className="mt-3 text-[10px]">Source verified</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t bg-muted/25">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">Make your next hire traceable.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Set up a workspace and publish your first role.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className={buttonVariants({ size: "lg" })} href="/register">
              Get started <ArrowRight data-icon="inline-end" />
            </Link>
            <Link className={buttonVariants({ variant: "outline", size: "lg" })} href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xs">
              <Brand size={28} />
              <p className="mt-3 text-sm text-muted-foreground">Traceable hiring for modern teams.</p>
            </div>
            <div className="flex gap-12 text-sm">
              <div className="flex flex-col gap-2">
                <span className="font-medium">Product</span>
                <NavLink href="#product">Features</NavLink>
                <NavLink href="#workflow">Workflow</NavLink>
                <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/dashboard">Workspace</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-medium">Account</span>
                <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/login">Sign in</Link>
                <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/register">Get started</Link>
              </div>
            </div>
          </div>
          <Separator className="my-8" />
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>© 2026 Joby.</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Scoped, auditable workspaces</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
