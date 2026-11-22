"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

interface NotificationRow {
  id: string;
  status: string;
  subject: string;
  recipient: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await api.getNotifications());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load notifications");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Candidate messages from stage changes and hiring decisions. Emails are sent when SMTP is configured.
          </p>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No notifications yet</EmptyTitle>
              <EmptyDescription>Stage updates and offer/reject/hire decisions appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{row.subject}</span>
                  <span className="text-sm text-muted-foreground">To: {row.recipient} · {new Date(row.createdAt).toLocaleString()}</span>
                </div>
                <Badge variant={row.status === "sent" ? "default" : "secondary"}>{row.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
