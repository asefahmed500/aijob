import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BrainCircuit,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  ScanSearch,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Logo } from "@/components/brand/logo";

const features = [
  { icon: Sparkles, title: "AI job posts", body: "A short brief becomes a publish-ready role." },
  { icon: ScanSearch, title: "Evidence ranking", body: "Every score cites the resume verbatim." },
  { icon: FileText, title: "Clean candidate CVs", body: "Generate, version and print in one click." },
  { icon: Bell, title: "Decisions that notify", body: "Offer, reject or hire with a full audit trail." },
  { icon: LockKeyhole, title: "Role-based access", body: "Owners, recruiters and viewers, scoped per tenant." },
  { icon: BrainCircuit, title: "Always available", body: "Labelled fallback keeps every flow working." },
];

const previewRows = [
  { name: "Alex Morgan", role: "Backend Engineer", score: "94%", stage: "interview" },
  { name: "Jordan Lee", role: "Platform Engineer", score: "88%", stage: "screening" },
  { name: "Sam Rivera", role: "Backend Engineer", score: "81%", stage: "offer" },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/" aria-label="aijob home"><Logo size={32} /></Link>
            <div className="hidden items-center gap-6 md:flex">
              <Link href="#product" className="text-sm text-muted-foreground hover:text-foreground">Product</Link>
              <Link href="#demo" className="text-sm text-muted-foreground hover:text-foreground">Preview</Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/login">Sign in</Link>
            <Link className={buttonVariants({ size: "sm" })} href="/register">
              Get started <ArrowRight data-icon="inline-end" />
            </Link>
          </div>
        </nav>
      </header>

      <section id="demo" className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,var(--primary)_0%,transparent_60%)] opacity-[0.07]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:py-20">
          <div className="flex flex-col gap-5">
            <Badge variant="secondary" className="w-fit gap-2"><Sparkles /> AI hiring workspace</Badge>
            <h1 className="text-4xl font-semibold sm:text-5xl">Hiring, grounded in evidence.</h1>
            <p className="max-w-md text-base text-muted-foreground">
              Post a role, rank candidates with quoted proof, and decide with confidence.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className={buttonVariants({ size: "lg" })} href="/register">
                Start hiring <ArrowRight data-icon="inline-end" />
              </Link>
              <Link className={buttonVariants({ variant: "outline", size: "lg" })} href="#product">
                Explore features
              </Link>
            </div>
          </div>

          <Card className="gap-0 overflow-hidden shadow-xl">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
              <span className="size-2.5 rounded-full bg-foreground/20" />
              <span className="size-2.5 rounded-full bg-foreground/20" />
              <span className="size-2.5 rounded-full bg-foreground/20" />
              <span className="ml-3 text-xs text-muted-foreground">app.aijob.dev / overview</span>
            </div>
            <div className="flex min-h-72">
              <aside className="hidden w-40 shrink-0 flex-col gap-1 border-r bg-muted/30 p-3 sm:flex">
                <div className="flex items-center gap-2 px-2 py-2"><Logo size={22} /><span className="text-sm font-semibold">aijob</span></div>
                <Separator className="my-2" />
                <span className="flex items-center gap-2 rounded-md bg-background px-2 py-2 text-xs font-medium shadow-sm"><LayoutDashboard /> Overview</span>
                <span className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground"><FileText /> Jobs</span>
                <span className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground"><Users /> Candidates</span>
                <span className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground"><Bell /> Alerts</span>
              </aside>
              <CardContent className="flex-1 p-5">
                <p className="text-xs text-muted-foreground">Overview</p>
                <p className="text-lg font-semibold">Hiring today</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "Open roles", value: "12" },
                    { label: "Candidates", value: "248" },
                    { label: "Matches", value: "94%" },
                    { label: "Decisions", value: "31" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-md border bg-card p-3">
                      <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 text-lg font-semibold">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-md border">
                  <div className="border-b px-3 py-2"><p className="text-xs font-medium">Top candidates</p></div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Role</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">{row.role}</TableCell>
                          <TableCell><Badge variant="secondary">{row.score}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{row.stage}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      <section id="product" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-semibold">Everything you need to hire.</h2>
          <p className="text-muted-foreground">One connected workspace, from job post to decision.</p>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"><feature.icon /></div>
                <CardTitle className="mt-2">{feature.title}</CardTitle>
                <CardDescription>{feature.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Logo size={32} />
            <p className="max-w-xs text-sm text-muted-foreground">Traceable hiring for modern teams.</p>
          </div>
          <div className="flex gap-10 text-sm">
            <div className="flex flex-col gap-2">
              <span className="font-medium">Product</span>
              <Link className="text-muted-foreground hover:text-foreground" href="#product">Features</Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/dashboard">Workspace</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-medium">Account</span>
              <Link className="text-muted-foreground hover:text-foreground" href="/login">Sign in</Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/register">Get started</Link>
            </div>
          </div>
        </div>
        <Separator />
        <div className="mx-auto w-full max-w-6xl px-6 py-5 text-xs text-muted-foreground">© 2026 aijob.</div>
      </footer>
    </main>
  );
}
