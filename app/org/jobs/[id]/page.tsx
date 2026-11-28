"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type JobDetail, type RankingEntry } from "@/lib/api";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = { params: Promise<{ id: string }> };

export default function JobRankingPage({ params }: Props) {
  const [id, setId] = useState<string | null>(null);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (jobId: string) => {
    try {
      const [detail, ranked] = await Promise.all([api.getJob(jobId), api.ranking(jobId)]);
      setJob(detail);
      setRanking(ranked);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load job ranking");
    }
  }, []);

  useEffect(() => {
    void params.then(async (resolved) => {
      setId(resolved.id);
      await load(resolved.id);
    });
  }, [params, load]);

  async function scoreAll() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.scoreJob(id);
      await load(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not score candidates");
    } finally {
      setBusy(false);
    }
  }

  if (!id) return <main className="flex flex-1 items-center justify-center">Loading…</main>;

  return (
    <main className="flex flex-1 flex-col px-6 py-12 lg:px-10">
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{job?.title ?? "Job"}</h1>
            <p className="text-sm text-muted-foreground">Candidates ranked by quoted resume evidence.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={scoreAll} loading={busy} disabled={ranking.length === 0}>
              Score all candidates
            </Button>
            {job?.status ? <Badge variant="outline">{job.status}</Badge> : null}
            {job?.publicToken ? (
              <Link className={buttonVariants({ variant: "outline" })} href={`/apply/${job.publicToken}`}>
                Public apply link
              </Link>
            ) : null}
          </div>
        </div>

        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        {job ? (
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
              <CardDescription>Each requirement is scored independently.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{job.requirements}</pre>
            </CardContent>
          </Card>
        ) : null}

        {ranking.map((entry, index) => (
          <Card key={entry.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">
                  #{index + 1} {entry.candidate.name}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={entry.score && entry.score.score >= 60 ? "default" : "secondary"}>
                    {entry.score ? `${entry.score.score}%` : "not scored"}
                  </Badge>
                  {entry.score ? <Badge variant="outline">{entry.score.source}</Badge> : null}
                  <Badge variant="outline">{entry.status}</Badge>
                  <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={`/org/candidates/${entry.candidate.id}`}>
                    Open
                  </Link>
                </div>
              </div>
              <CardDescription>{entry.candidate.email} · {entry.status}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {entry.score ? (
                <>
                  <p className="text-sm">{entry.score.summary}</p>
                  {entry.score.evidences.map((evidence) => (
                    <div key={evidence.id} className="flex flex-col gap-1 rounded-md border p-3">
                      <span className="text-sm font-medium">{evidence.requirement}</span>
                      <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">“{evidence.quote}”</blockquote>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Run scoring to see matched evidence.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
