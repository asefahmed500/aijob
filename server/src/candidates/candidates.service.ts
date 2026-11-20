import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCandidateDto } from "./dto/candidate.dto";

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.candidate.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { applications: true } } },
    });
  }

  create(organizationId: string, dto: CreateCandidateDto) {
    return this.prisma.candidate.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        email: dto.email.toLowerCase(),
        resumeText: dto.resumeText.trim(),
      },
    });
  }

  async findOwned(organizationId: string, candidateId: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
    });
    if (!candidate) throw new NotFoundException("Candidate not found");
    return candidate;
  }

  async get(organizationId: string, candidateId: string) {
    await this.findOwned(organizationId, candidateId);
    return this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        applications: {
          include: {
            job: true,
            scores: { orderBy: { createdAt: "desc" }, include: { evidences: true } },
          },
        },
      },
    });
  }

  async apply(organizationId: string, candidateId: string, jobId: string) {
    await this.findOwned(organizationId, candidateId);
    const job = await this.prisma.jobPost.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) throw new NotFoundException("Job not found");

    const existing = await this.prisma.candidateApplication.findUnique({
      where: { jobId_candidateId: { jobId, candidateId } },
    });
    if (existing) {
      throw new BadRequestException("Candidate is already applied to this job");
    }
    return this.prisma.candidateApplication.create({
      data: { jobId, candidateId },
    });
  }

  async ranking(organizationId: string, jobId: string) {
    const job = await this.prisma.jobPost.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) throw new NotFoundException("Job not found");

    const applications = await this.prisma.candidateApplication.findMany({
      where: { jobId },
      include: {
        candidate: true,
        scores: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { evidences: true },
        },
      },
    });

    return applications
      .map((application) => ({
        id: application.id,
        status: application.status,
        candidate: application.candidate,
        score: application.scores[0] ?? null,
      }))
      .sort((a, b) => (b.score?.score ?? -1) - (a.score?.score ?? -1));
  }
}
