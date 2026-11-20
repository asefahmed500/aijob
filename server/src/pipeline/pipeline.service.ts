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
