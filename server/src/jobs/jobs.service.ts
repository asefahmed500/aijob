import { randomUUID } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AgenticService } from "../agentic/agentic.service";
import { normaliseFormFields } from "../common/form-fields";
import { CreateJobDto, UpdateJobFormDto } from "./dto/job.dto";
import type { Prisma } from "../../generated/prisma";

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentic: AgenticService,
  ) {}

  list(organizationId: string) {
    return this.prisma.jobPost.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { applications: true } } },
    });
  }

  create(organizationId: string, dto: CreateJobDto) {
    return this.prisma.jobPost.create({
      data: {
        organizationId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        requirements: dto.requirements.trim(),
        publicToken: randomUUID(),
        source: dto.source ?? "manual",
        formFields: JSON.stringify(normaliseFormFields(dto.formFields)),
        formExpiresAt: dto.formExpiresAt ? new Date(dto.formExpiresAt) : null,
        autoScreen: dto.autoScreen ?? true,
      },
    });
  }

  async updateForm(organizationId: string, jobId: string, dto: UpdateJobFormDto) {
    await this.findOwned(organizationId, jobId);
    const data: Prisma.JobPostUpdateInput = {};
    if (dto.formFields !== undefined) {
      data.formFields = JSON.stringify(normaliseFormFields(dto.formFields));
    }
    if (dto.formExpiresAt !== undefined) {
      data.formExpiresAt = dto.formExpiresAt ? new Date(dto.formExpiresAt) : null;
    }
    if (dto.autoScreen !== undefined) data.autoScreen = dto.autoScreen;
    return this.prisma.jobPost.update({ where: { id: jobId }, data });
  }

  draft(brief: string) {
    return this.agentic.draftJobPost(brief);
  }

  async setStatus(organizationId: string, jobId: string, status: string) {
    await this.findOwned(organizationId, jobId);
    return this.prisma.jobPost.update({
      where: { id: jobId },
      data: { status },
    });
  }

  async findOwned(organizationId: string, jobId: string) {
    const job = await this.prisma.jobPost.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) throw new NotFoundException("Job not found");
    return job;
  }

  async get(organizationId: string, jobId: string) {
    await this.findOwned(organizationId, jobId);
    return this.prisma.jobPost.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          orderBy: { createdAt: "asc" },
          include: {
            candidate: true,
            scores: {
              orderBy: { createdAt: "desc" },
              include: { evidences: true },
            },
          },
        },
      },
    });
  }

  async remove(organizationId: string, jobId: string) {
    await this.findOwned(organizationId, jobId);
    await this.prisma.jobPost.delete({ where: { id: jobId } });
    return { ok: true };
  }
}
