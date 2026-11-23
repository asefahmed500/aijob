import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ScoringService } from "../scoring/scoring.service";
import {
  isLinkExpired,
  parseFormFields,
  serialiseFormAnswers,
  validateFormAnswers,
  type FormAnswers,
} from "../common/form-fields";
import { PublicApplyDto } from "./dto/public-apply.dto";

@Injectable()
export class PublicApplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
  ) {}

  async getJob(token: string) {
    if (!token) throw new NotFoundException("Job link not found");
    const job = await this.prisma.jobPost.findFirst({
      where: { publicToken: token },
      include: { organization: { select: { name: true } } },
    });
    if (!job) throw new NotFoundException("Job link not found");

    const expired = isLinkExpired(job.formExpiresAt);
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      status: expired ? "expired" : job.status,
      company: job.organization.name,
      formFields: parseFormFields(job.formFields),
      formExpiresAt: job.formExpiresAt ? job.formExpiresAt.toISOString() : null,
      autoScreen: job.autoScreen,
    };
  }

  async apply(token: string, dto: PublicApplyDto) {
    if (!token) throw new NotFoundException("Job link not found");
    const job = await this.prisma.jobPost.findFirst({ where: { publicToken: token } });
    if (!job) throw new NotFoundException("Job link not found");
    if (isLinkExpired(job.formExpiresAt)) {
      throw new BadRequestException("This application link has expired");
    }
    if (job.status !== "open") {
      throw new BadRequestException("This job is no longer accepting applications");
    }

    const fields = parseFormFields(job.formFields);
    const rawAnswers: unknown = dto.answers ?? {};
    const answers: FormAnswers =
      rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
        ? (rawAnswers as FormAnswers)
        : {};
    const answerErrors = validateFormAnswers(fields, answers);
    if (answerErrors.length > 0) throw new BadRequestException(answerErrors.join(" "));
    const formAnswers = serialiseFormAnswers(fields, answers);

    const email = dto.email.toLowerCase();
    let candidate = await this.prisma.candidate.findFirst({
      where: { organizationId: job.organizationId, email },
    });
    if (!candidate) {
      candidate = await this.prisma.candidate.create({
        data: {
          organizationId: job.organizationId,
          name: dto.name.trim(),
          email,
          resumeText: dto.resumeText.trim(),
          source: "portal",
        },
      });
    } else {
      candidate = await this.prisma.candidate.update({
        where: { id: candidate.id },
        data: { resumeText: dto.resumeText.trim() },
      });
    }

    const existing = await this.prisma.candidateApplication.findUnique({
      where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } },
    });
    if (existing) throw new BadRequestException("You have already applied to this job");

    const application = await this.prisma.candidateApplication.create({
      data: { jobId: job.id, candidateId: candidate.id, formAnswers },
    });
    await this.prisma.activityEvent.create({
      data: {
        organizationId: job.organizationId,
        applicationId: application.id,
        actorId: candidate.id,
        type: "application_received",
        message: `${candidate.name} applied through the public form`,
      },
    });

    // Every submitted answer is screened together with the resume. A screening
    // failure must never cost the candidate their submission.
    let screening: { id: string; score: number; source: string; summary: string } | null = null;
    if (job.autoScreen) {
      try {
        const score = await this.scoring.scoreApplication(job.organizationId, application.id);
        screening = { id: score.id, score: score.score, source: score.source, summary: score.summary };
        await this.prisma.activityEvent.create({
          data: {
            organizationId: job.organizationId,
            applicationId: application.id,
            actorId: candidate.id,
            type: "auto_screened",
            message: `AI screening completed: ${score.score}% match (${score.source})`,
          },
        });
      } catch {
        // Recruiter can still run scoring manually from the job ranking page.
      }
    }

    return { applicationId: application.id, jobTitle: job.title, screening };
  }
}
