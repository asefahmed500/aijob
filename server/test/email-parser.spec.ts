import { parseEmail } from "../src/emails/email-parser";

describe("parseEmail", () => {
  it("extracts subject, sender and date from an .eml style message", () => {
    const raw =
      "From: manager@example.com\nSubject: Project update\nDate: 2026-11-12T15:30:00Z\n\nBuilt a REST API in NestJS.\nImproved latency by 40%.";
    const parsed = parseEmail(raw);
    expect(parsed.subject).toBe("Project update");
    expect(parsed.fromAddress).toBe("manager@example.com");
    expect(parsed.receivedAt?.toISOString()).toBe("2026-11-12T15:30:00.000Z");
    expect(parsed.normalizedBody).toContain("Built a REST API in NestJS.");
  });

  it("removes quoted reply lines so evidence quotes come from new content", () => {
    const raw = "Subject: Re: Role\n\nMy new answer here.\n> Old quoted text\n> More quoting";
    const parsed = parseEmail(raw);
    expect(parsed.normalizedBody).toBe("My new answer here.");
    expect(parsed.normalizedBody).not.toContain("Old quoted text");
  });

  it("keeps the original body text verbatim when there is no header block", () => {
    const parsed = parseEmail("A plain pasted email body with no headers.");
    expect(parsed.normalizedBody).toBe("A plain pasted email body with no headers.");
    expect(parsed.subject).toBeNull();
  });
});
