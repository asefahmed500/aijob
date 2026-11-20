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

  async search(
    organizationId: string,
    options: {
      q?: string;
      stage?: string;
      jobId?: string;
      minScore?: number;
      sort?: "score" | "name" | "recent";
    },
  ) {
    const candidates = await this.prisma.candidate.findMany({
      where: { organizationId },
      include: {
        applications: {
          include: {
            job: { select: { id: true, title: true } },
            scores: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    const query = options.q?.toLowerCase().trim();
    const filtered = candidates
      .map((candidate) => {
        const application = options.jobId
          ? candidate.applications.find((item) => item.jobId === options.jobId)
          : candidate.applications[0];
        return {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          source: candidate.source,
          createdAt: candidate.createdAt,
          application: application
            ? {
                id: application.id,
                stage: application.stage,
                rating: application.rating,
                jobTitle: application.job.title,
                score: application.scores[0]?.score ?? null,
                scoreSource: application.scores[0]?.source ?? null,
              }
            : null,
        };
      })
      .filter((row) => {
        if (query && !`${row.name} ${row.email}`.toLowerCase().includes(query)) return false;
        if (options.stage && row.application?.stage !== options.stage) return false;
        if (options.jobId && !row.application) return false;
        if (options.minScore !== undefined && (row.application?.score ?? -1) < options.minScore) {
          return false;
        }
        return true;
      });

    const sort = options.sort ?? "score";
    filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recent") return b.createdAt.getTime() - a.createdAt.getTime();
      return (b.application?.score ?? -1) - (a.application?.score ?? -1);
    });
    return filtered;
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
