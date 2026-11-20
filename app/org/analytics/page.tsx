"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AnalyticsSummary } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; status: string; subject: string; recipient: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [data, events] = await Promise.all([api.getAnalytics(), api.getNotifications()]);
      setSummary(data);
      setNotifications(events);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load analytics");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Organization-scoped funnel and scoring metrics.</p>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        {summary ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card><CardHeader><CardTitle>{summary.totals.jobs}</CardTitle><CardDescription>Jobs</CardDescription></CardHeader></Card>
              <Card><CardHeader><CardTitle>{summary.totals.candidates}</CardTitle><CardDescription>Candidates</CardDescription></CardHeader></Card>
              <Card><CardHeader><CardTitle>{summary.totals.applications}</CardTitle><CardDescription>Applications</CardDescription></CardHeader></Card>
              <Card><CardHeader><CardTitle>{summary.averageScore}%</CardTitle><CardDescription>Average match score</CardDescription></CardHeader></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Pipeline funnel</CardTitle><CardDescription>Candidates by current stage.</CardDescription></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(summary.candidatesByStage).map(([stage, count]) => (
                  <Badge key={stage} variant="secondary">{stage}: {count}</Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Scoring methods</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(summary.scoreSources).map(([source, count]) => (
                  <Badge key={source} variant="outline">{source}: {count}</Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {summary.recentActivity.map((event) => (
                  <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0">
                    <span className="text-sm">{event.message}</span>
                    <Badge variant="outline">{event.type}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}

        <Card>
          <CardHeader><CardTitle>Notification log</CardTitle><CardDescription>Messages queued on stage changes. Live sending is opt-in via NOTIFICATIONS_ENABLED.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {notifications.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0">
                <span className="text-sm">{item.subject} → {item.recipient}</span>
                <Badge variant="outline">{item.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
