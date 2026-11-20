import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(organizationId: string) {
    const [jobs, candidates, applications, scores, events] = await Promise.all([
      this.prisma.jobPost.findMany({
        where: { organizationId },
        select: { status: true },
      }),
      this.prisma.candidate.count({ where: { organizationId } }),
      this.prisma.candidateApplication.findMany({
        where: { job: { organizationId } },
        select: { stage: true },
      }),
      this.prisma.candidateScore.findMany({
        where: { application: { job: { organizationId } } },
        select: { score: true, source: true },
      }),
      this.prisma.activityEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const jobsByStatus: Record<string, number> = {};
    for (const job of jobs) jobsByStatus[job.status] = (jobsByStatus[job.status] ?? 0) + 1;

    const candidatesByStage: Record<string, number> = {};
    for (const application of applications) {
      candidatesByStage[application.stage] = (candidatesByStage[application.stage] ?? 0) + 1;
    }

    const averageScore =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((total, item) => total + item.score, 0) / scores.length);

    const scoreSources: Record<string, number> = {};
    for (const score of scores) scoreSources[score.source] = (scoreSources[score.source] ?? 0) + 1;

    return {
      totals: {
        jobs: jobs.length,
        candidates,
        applications: applications.length,
        scoredApplications: scores.length,
      },
      jobsByStatus,
      candidatesByStage,
      averageScore,
      scoreSources,
      recentActivity: events,
    };
  }
}
