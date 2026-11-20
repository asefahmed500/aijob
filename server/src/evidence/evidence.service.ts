import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ApplicationsService } from "../applications/applications.service";
import { ZaiClient } from "../ai/zai.client";
import { EXTRACT_EVIDENCE_SYSTEM } from "../ai/prompts";
import { deterministicEvidence } from "../ai/deterministic";
import { ExtractedItem, toLocatedEvidence } from "./evidence.validator";

interface ExtractionResponse {
  items?: ExtractedItem[];
}

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applications: ApplicationsService,
    private readonly zai: ZaiClient,
  ) {}

  async list(userId: string, applicationId: string) {
    await this.applications.findOwned(userId, applicationId);
    return this.prisma.evidence.findMany({
      where: { applicationId },
      orderBy: { createdAt: "asc" },
      include: { emailSource: { select: { subject: true, id: true } } },
    });
  }

  async extract(userId: string, applicationId: string) {
    await this.applications.findOwned(userId, applicationId);
    const emails = await this.prisma.emailSource.findMany({
      where: { applicationId },
      orderBy: { createdAt: "asc" },
    });
    if (emails.length === 0) {
      throw new BadRequestException("Add at least one email before extracting evidence");
    }

    let accepted = 0;
    let rejected = 0;

    let usedFallback = false;

    for (const email of emails) {
      let items: ExtractedItem[] = [];
      let source = "zai";
      let rawResponse: string;

      try {
        const result = await this.zai.chatJson<ExtractionResponse>([
          { role: "system", content: EXTRACT_EVIDENCE_SYSTEM },
          {
            role: "user",
            content: `Email subject: ${email.subject ?? "(none)"}\n\nEmail body:\n${email.normalizedBody}`,
          },
        ]);
        items = result.items ?? [];
        rawResponse = JSON.stringify(result);
      } catch (error) {
        usedFallback = true;
        source = "deterministic";
        items = deterministicEvidence(email.normalizedBody);
        rawResponse = JSON.stringify({
          fallbackReason: (error as Error).message,
          items,
        });
      }

      for (const item of items) {
        const located = toLocatedEvidence(item, email.normalizedBody);
        if (!located) {
          rejected += 1;
          continue;
        }
        await this.prisma.evidence.create({
          data: {
            applicationId,
            emailSourceId: email.id,
            kind: located.kind,
            claim: located.claim,
            verbatimQuote: located.verbatimQuote,
            charStart: located.charStart,
            charEnd: located.charEnd,
            confidence: located.confidence,
            source,
            rawResponse,
          },
        });
        accepted += 1;
      }
    }

    if (usedFallback) {
      console.warn("Evidence extraction used the deterministic fallback because the AI provider was unavailable");
    }

    return {
      accepted,
      rejected,
      usedFallback,
      items: await this.list(userId, applicationId),
    };
  }

  async review(userId: string, evidenceId: string, approved: boolean, claim?: string) {
    const existing = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { application: true },
    });
    if (!existing || existing.application.userId !== userId) {
      throw new NotFoundException("Evidence not found");
    }
    return this.prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        approved,
        ...(claim !== undefined ? { claim } : {}),
      },
    });
  }

  async remove(userId: string, evidenceId: string) {
    const existing = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { application: true },
    });
    if (!existing || existing.application.userId !== userId) {
      throw new NotFoundException("Evidence not found");
    }
    await this.prisma.evidence.delete({ where: { id: evidenceId } });
    return { ok: true };
  }
}
