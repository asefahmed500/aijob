import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PublicApplyDto } from "./dto/public-apply.dto";

@Injectable()
export class PublicApplyService {
  constructor(private readonly prisma: PrismaService) {}

  async getJob(token: string) {
    if (!token) throw new NotFoundException("Job link not found");
    const job = await this.prisma.jobPost.findFirst({
      where: { publicToken: token },
      include: { organization: { select: { name: true } } },
    });
    if (!job) throw new NotFoundException("Job link not found");
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      status: job.status,
      company: job.organization.name,
    };
  }

  async apply(token: string, dto: PublicApplyDto) {
    if (!token) throw new NotFoundException("Job link not found");
    const job = await this.prisma.jobPost.findFirst({ where: { publicToken: token } });
    if (!job) throw new NotFoundException("Job link not found");
    if (job.status !== "open") throw new BadRequestException("This job is no longer accepting applications");

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
      data: { jobId: job.id, candidateId: candidate.id },
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

    return { applicationId: application.id, jobTitle: job.title };
  }
}
