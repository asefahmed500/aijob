import { randomUUID } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateJobDto } from "./dto/job.dto";

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
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
