import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ZaiClient } from "../ai/zai.client";
import { formatAnswersForScreening, parseFormAnswers, parseFormFields } from "../common/form-fields";
import { SCORE_CANDIDATE_SYSTEM, SCORING_PROMPT_VERSION } from "./scoring.prompt";
import {
  requirementCount,
  scoreDeterministic,
  type ScoreMatch,
} from "./deterministic-scorer";

interface AiScoringResponse {
  matches?: Array<{ requirement: string; quote: string }>;
}

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zai: ZaiClient,
  ) {}

  private async loadApplication(organizationId: string, applicationId: string) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: { candidate: true, job: true },
    });
    if (!application || application.job.organizationId !== organizationId) {
      throw new NotFoundException("Application not found");
    }
    return application;
  }

  async scoreApplication(organizationId: string, applicationId: string) {
    const application = await this.loadApplication(organizationId, applicationId);
    const answerText = formatAnswersForScreening(
      parseFormFields(application.job.formFields),
      parseFormAnswers(application.formAnswers),
    );
    // Form answers are part of the screening source, so quoted evidence stays
    // an exact substring of the text the model and deterministic scorer see.
    const resume = answerText
      ? `${application.candidate.resumeText}\n${answerText}`
      : application.candidate.resumeText;
    const requirements = application.job.requirements;

    let matches: ScoreMatch[] = [];
    let source = "deterministic";
    let rawResponse: string | null = null;

    try {
      const response = await this.zai.chatJson<AiScoringResponse>([
        { role: "system", content: SCORE_CANDIDATE_SYSTEM },
        {
          role: "user",
          content: `Job requirements:\n${requirements}\n\nCandidate resume:\n${resume}`,
        },
      ]);
      rawResponse = JSON.stringify(response);
      const valid = (response.matches ?? [])
        .map((item) => {
          const start = resume.indexOf(item.quote);
          if (start < 0 || !item.requirement) return null;
          return {
            requirement: item.requirement,
            quote: item.quote,
            charStart: start,
            charEnd: start + item.quote.length,
          } satisfies ScoreMatch;
        })
        .filter((item): item is ScoreMatch => item !== null);
      if (valid.length > 0) {
        matches = valid;
        source = "zai";
      }
    } catch {
      // Provider unavailable or invalid JSON: deterministic path below.
    }

    if (matches.length === 0) {
      matches = scoreDeterministic(requirements, resume);
      rawResponse = rawResponse ?? JSON.stringify({ deterministic: true, matches });
    }

    const total = requirementCount(requirements);
    const score = total === 0 ? 0 : Math.min(100, Math.round((matches.length / total) * 100));
    const summary = `Matched ${matches.length} of ${total} requirements using quoted resume evidence (method: ${source}).`;

    return this.prisma.candidateScore.create({
      data: {
        applicationId,
        score,
        summary,
        model: this.zai.model,
        source,
        rawResponse,
        evidences: {
          create: matches.map((item) => ({
            requirement: item.requirement,
            quote: item.quote,
            charStart: item.charStart,
            charEnd: item.charEnd,
          })),
        },
      },
      include: { evidences: true },
    });
  }

  async scoreJob(organizationId: string, jobId: string) {
    const job = await this.prisma.jobPost.findFirst({
      where: { id: jobId, organizationId },
      include: { applications: true },
    });
    if (!job) throw new NotFoundException("Job not found");

    const results = [];
    for (const application of job.applications) {
      results.push({
        applicationId: application.id,
        score: await this.scoreApplication(organizationId, application.id),
      });
    }
    return results;
  }
}
