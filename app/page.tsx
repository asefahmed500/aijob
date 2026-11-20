import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { title: "Email", body: "Paste or upload job and project emails. Sample data is included." },
  { title: "Evidence", body: "Extract claims that must quote the source email verbatim." },
  { title: "Cover letter", body: "Generate a letter grounded only in approved evidence." },
  { title: "Export", body: "Download Markdown or DOCX, print to PDF, copy, or email it." },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-4xl flex flex-col gap-10">
        <div className="flex flex-col gap-4">
          <Badge variant="secondary" className="w-fit">Backend: NestJS · Frontend: Next.js</Badge>
          <h1 className="text-4xl font-semibold tracking-tight">Evidence-grounded cover letters</h1>
          <p className="max-w-2xl text-muted-foreground">
            aijob turns the emails you already have into verifiable evidence, then writes a cover
            letter that can be traced back to its source. Every claim carries its quote.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className={buttonVariants({ size: "lg" })} href="/dashboard">
              Open dashboard
            </Link>
            <Link
              className={buttonVariants({ variant: "outline", size: "lg" })}
              href="/login"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <CardHeader>
                <CardTitle>{index + 1}. {step.title}</CardTitle>
                <CardDescription>{step.body}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Step {index + 1} of 4 in the core workflow.
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
