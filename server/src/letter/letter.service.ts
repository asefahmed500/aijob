import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ApplicationsService } from "../applications/applications.service";
import { ZaiClient } from "../ai/zai.client";
import { GENERATE_LETTER_SYSTEM, PROMPT_VERSION } from "../ai/prompts";
import { deterministicLetter } from "../ai/deterministic";
import { LetterResponse, validateLetterResponse } from "./letter.validator";

@Injectable()
export class LetterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applications: ApplicationsService,
    private readonly zai: ZaiClient,
  ) {}

  async list(userId: string, applicationId: string) {
    await this.applications.findOwned(userId, applicationId);
    return this.prisma.coverLetter.findMany({
      where: { applicationId },
      orderBy: { version: "desc" },
      include: { claims: true },
    });
  }

  async generate(userId: string, applicationId: string) {
    const application = await this.applications.findOwned(userId, applicationId);
    const evidence = await this.prisma.evidence.findMany({
      where: { applicationId, approved: true },
      orderBy: { createdAt: "asc" },
    });
    if (evidence.length === 0) {
      throw new BadRequestException("Approve at least one evidence item before generating a letter");
    }

    const evidenceList = evidence
      .map(
        (item) =>
          `- id=${item.id} [${item.kind}] claim: ${item.claim} | source quote: "${item.verbatimQuote}"`,
      )
      .join("\n");

    let response: LetterResponse;
    let source = "zai";
    let rawResponse: string;
    try {
      response = await this.zai.chatJson<LetterResponse>([
        { role: "system", content: GENERATE_LETTER_SYSTEM },
        {
          role: "user",
          content: `Company: ${application.company}\nRole: ${application.role}\n\nApproved evidence:\n${evidenceList}`,
        },
      ]);
      rawResponse = JSON.stringify(response);
    } catch (error) {
      source = "deterministic";
      response = deterministicLetter(
        application.company,
        application.role,
        evidence.map((item) => ({ id: item.id, kind: item.kind, claim: item.claim })),
      );
      rawResponse = JSON.stringify({
        fallbackReason: (error as Error).message,
        response,
      });
      console.warn("Cover letter generation used the deterministic fallback because the AI provider was unavailable");
    }

    const validIds = new Set(evidence.map((item) => item.id));
    const validated = validateLetterResponse(response, validIds);
    const latest = await this.prisma.coverLetter.findFirst({
      where: { applicationId },
      orderBy: { version: "desc" },
    });
    const version = (latest?.version ?? 0) + 1;

    return this.prisma.coverLetter.create({
      data: {
        applicationId,
        content: validated.content,
        model: this.zai.model,
        promptVersion: PROMPT_VERSION,
        source,
        rawResponse,
        version,
        claims: {
          create: validated.claims.map((claim) => ({
            sentence: claim.sentence,
            evidenceId: claim.evidenceId,
            grounded: claim.grounded,
            note: claim.note,
          })),
        },
      },
      include: { claims: true },
    });
  }

  async latest(userId: string, applicationId: string) {
    await this.applications.findOwned(userId, applicationId);
    return this.prisma.coverLetter.findFirst({
      where: { applicationId },
      orderBy: { version: "desc" },
      include: { claims: true },
    });
  }
}
