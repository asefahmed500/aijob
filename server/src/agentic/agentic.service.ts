import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ZaiClient } from "../ai/zai.client";
import {
  buildCvDeterministic,
  renderCv,
  validateAiCv,
  type CvDocument,
} from "./cv-builder";
import { draftJobPostDeterministic, normaliseJobDraft, type JobDraft } from "./job-draft";
import { CV_SYSTEM, JOB_DRAFT_SYSTEM } from "./prompts";

export interface GeneratedJobDraft extends JobDraft {
  source: "zai" | "deterministic";
}

@Injectable()
export class AgenticService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zai: ZaiClient,
  ) {}

  /** Drafts a job post for review; the employer still confirms and creates the job. */
  async draftJobPost(brief: string): Promise<GeneratedJobDraft> {
    try {
      const response = await this.zai.chatJson<unknown>([
        { role: "system", content: JOB_DRAFT_SYSTEM },
        { role: "user", content: `Hiring brief:\n${brief}` },
      ]);
      const draft = normaliseJobDraft(response);
      if (draft) return { ...draft, source: "zai" };
    } catch {
      // Provider unavailable or unusable output: deterministic draft below.
    }
    return { ...draftJobPostDeterministic(brief), source: "deterministic" };
  }

  /** Creates a new CV version for a candidate, with every structured item traceable. */
  async generateCv(organizationId: string, candidateId: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
    });
    if (!candidate) throw new NotFoundException("Candidate not found");

    let document: CvDocument | null = null;
    let source: "zai" | "deterministic" = "deterministic";

    try {
      const response = await this.zai.chatJson<unknown>([
        { role: "system", content: CV_SYSTEM },
        {
          role: "user",
          content: `Name: ${candidate.name}\nEmail: ${candidate.email}\nResume:\n${candidate.resumeText}`,
        },
      ]);
      document = validateAiCv(response, candidate.resumeText);
      if (document) source = "zai";
    } catch {
      // Provider unavailable or output failed quote verification: deterministic CV below.
    }

    document ??= buildCvDeterministic(candidate.name, candidate.email, candidate.resumeText);
    const latest = await this.prisma.candidateCv.findFirst({
      where: { candidateId },
      orderBy: { version: "desc" },
    });

    return this.prisma.candidateCv.create({
      data: {
        candidateId,
        headline: document.headline,
        summary: document.summary,
        skills: document.skills.join("\n"),
        experience: document.experience.join("\n"),
        education: document.education.join("\n"),
        content: renderCv(document),
        source,
        model: this.zai.model,
        version: (latest?.version ?? 0) + 1,
      },
    });
  }
}
