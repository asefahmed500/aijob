export interface ParsedEmail {
  subject: string | null;
  fromAddress: string | null;
  receivedAt: Date | null;
  normalizedBody: string;
}

function decodeHeader(value: string): string {
  return value.replace(/=\?utf-8\?[bq]\?([^?]*)\?=/gi, (_m, payload: string, offset: number, full: string) => {
    const encoding = full.slice(offset + 2, offset + 3).toUpperCase();
    try {
      return encoding === "B"
        ? Buffer.from(payload, "base64").toString("utf8")
        : decodeURIComponent(payload.replace(/_/g, " ").replace(/=20/g, " "));
    } catch {
      return payload;
    }
  });
}

function stripQuotedReplies(body: string): string {
  const lines = body.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) continue;
    if (/^\s*On .+ wrote:\s*$/.test(line)) break;
    if (/^\s*-{2,}\s*$/.test(line) && kept.length > 0) break;
    kept.push(line);
  }
  return kept.join("\n").trim();
}

export function parseEmail(raw: string): ParsedEmail {
  const normalizedRaw = raw.replace(/\r\n/g, "\n");
  const separator = normalizedRaw.indexOf("\n\n");
  const headerBlock = separator >= 0 ? normalizedRaw.slice(0, separator) : "";
  const bodyBlock = separator >= 0 ? normalizedRaw.slice(separator + 2) : normalizedRaw;

  let subject: string | null = null;
  let fromAddress: string | null = null;
  let receivedAt: Date | null = null;

  for (const line of headerBlock.split("\n")) {
    const match = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, name, value] = match;
    switch (name.toLowerCase()) {
      case "subject":
        subject = decodeHeader(value.trim());
        break;
      case "from":
        fromAddress = value.trim();
        break;
      case "date": {
        const parsed = new Date(value.trim());
        if (!Number.isNaN(parsed.getTime())) receivedAt = parsed;
        break;
      }
    }
  }

  return {
    subject,
    fromAddress,
    receivedAt,
    normalizedBody: stripQuotedReplies(bodyBlock),
  };
}
