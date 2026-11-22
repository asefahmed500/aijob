import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SmtpService } from "../exports/smtp.service";
import { PIPELINE_STAGES } from "./dto/pipeline.dto";

@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smtp: SmtpService,
  ) {}

  private async load(organizationId: string, applicationId: string) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: { candidate: true, job: true },
    });
    if (!application || application.job.organizationId !== organizationId) {
      throw new NotFoundException("Application not found");
    }
    return application;
  }

  async updateStage(
    organizationId: string,
    applicationId: string,
    actorId: string,
    stage: string,
    rating?: number,
  ) {
    if (!(PIPELINE_STAGES as readonly string[]).includes(stage)) {
      throw new BadRequestException("Unsupported pipeline stage");
    }
    const application = await this.load(organizationId, applicationId);
    const previous = application.stage;

    const updated = await this.prisma.candidateApplication.update({
      where: { id: applicationId },
      data: { stage, ...(rating !== undefined ? { rating } : {}) },
    });

    await this.prisma.activityEvent.create({
      data: {
        organizationId,
        applicationId,
        actorId,
        type: "stage_change",
        message: `Stage changed from ${previous} to ${stage}`,
      },
    });

    await this.notify(
      organizationId,
      applicationId,
      application.candidate.email,
      `Update on your application for ${application.job.title}`,
      `Your application has moved to the ${stage} stage.`,
    );

    return updated;
  }

  /**
   * Records an explicit hiring decision, moves the application, and notifies the
   * candidate. Reuses the existing status/stage and NotificationLog records.
   */
  async decide(
    organizationId: string,
    applicationId: string,
    actorId: string,
    decision: "offer" | "reject" | "hire",
    message?: string,
  ) {
    const application = await this.load(organizationId, applicationId);
    const jobTitle = application.job.title;
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const company = organization?.name ?? "our team";

    const plans = {
      offer: {
        stage: "offer",
        status: "offer_sent",
        eventType: "decision_offer",
        subject: `Offer for ${jobTitle} at ${company}`,
        defaultBody: `We are pleased to offer you the ${jobTitle} role at ${company}. Please check your email for the next steps.`,
      },
      reject: {
        stage: "rejected",
        status: "rejected",
        eventType: "decision_rejected",
        subject: `Update on your application for ${jobTitle}`,
        defaultBody: `Thank you for your interest in the ${jobTitle} role at ${company}. We have decided to move forward with other candidates.`,
      },
      hire: {
        stage: "hired",
        status: "hired",
        eventType: "decision_hired",
        subject: `Welcome to the team — ${jobTitle}`,
        defaultBody: `We are delighted to confirm your hire for the ${jobTitle} role at ${company}. Our team will be in touch with onboarding details.`,
      },
    } as const;
    const plan = plans[decision];

    const updated = await this.prisma.candidateApplication.update({
      where: { id: applicationId },
      data: { stage: plan.stage, status: plan.status },
    });

    await this.prisma.activityEvent.create({
      data: {
        organizationId,
        applicationId,
        actorId,
        type: plan.eventType,
        message: `Decision recorded: ${decision}${message ? ` — ${message}` : ""}`,
      },
    });

    const notification = await this.notify(
      organizationId,
      applicationId,
      application.candidate.email,
      plan.subject,
      message?.trim() || plan.defaultBody,
    );

    return {
      id: updated.id,
      stage: updated.stage,
      status: updated.status,
      decision,
      notificationId: notification.id,
      notificationStatus: notification.status,
    };
  }

  async addNote(organizationId: string, applicationId: string, actorId: string, body: string) {
    await this.load(organizationId, applicationId);
    const note = await this.prisma.candidateNote.create({
      data: { applicationId, authorId: actorId, body },
    });
    await this.prisma.activityEvent.create({
      data: { organizationId, applicationId, actorId, type: "note_added", message: "Note added" },
    });
    return note;
  }

  notes(organizationId: string, applicationId: string) {
    return this.prisma.candidateNote.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async timeline(organizationId: string, applicationId: string) {
    await this.load(organizationId, applicationId);
    return this.prisma.activityEvent.findMany({
      where: { organizationId, applicationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async bulkStage(organizationId: string, applicationIds: string[], stage: string, actorId: string) {
    if (!(PIPELINE_STAGES as readonly string[]).includes(stage)) {
      throw new BadRequestException("Unsupported pipeline stage");
    }
    const results = [];
    for (const id of applicationIds) {
      results.push(await this.updateStage(organizationId, id, actorId, stage));
    }
    return results;
  }

  notifications(organizationId: string) {
    return this.prisma.notificationLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  private async notify(
    organizationId: string,
    applicationId: string,
    recipient: string,
    subject: string,
    body: string,
  ) {
    const log = await this.prisma.notificationLog.create({
      data: { organizationId, applicationId, recipient, subject, body, status: "queued" },
    });
    if (process.env.NOTIFICATIONS_ENABLED !== "true" || !this.smtp.isConfigured()) {
      return log;
    }
    try {
      await this.smtp.send(recipient, subject, {
        content: body,
        contentType: "text/plain; charset=utf-8",
        filename: "notification.txt",
      });
      return this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: "sent" },
      });
    } catch {
      return this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: "failed" },
      });
    }
  }
}
