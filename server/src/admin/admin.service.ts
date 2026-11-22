import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [users, organizations, jobs, candidates, applications, scores, decisions] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.organization.count(),
        this.prisma.jobPost.count(),
        this.prisma.candidate.count(),
        this.prisma.candidateApplication.count(),
        this.prisma.candidateScore.count(),
        this.prisma.activityEvent.count({ where: { type: { startsWith: "decision" } } }),
      ]);
    return {
      totals: { users, organizations, jobs, candidates, applications, scores, decisions },
    };
  }

  async organizations() {
    const records = await this.prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true, jobs: true, candidates: true } },
        memberships: { select: { role: true } },
      },
    });
    return records.map((record) => ({
      id: record.id,
      name: record.name,
      slug: record.slug,
      createdAt: record.createdAt,
      members: record._count.memberships,
      jobs: record._count.jobs,
      candidates: record._count.candidates,
      roles: [...new Set(record.memberships.map((item) => item.role))],
    }));
  }

  async users() {
    const records = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    });
    return records.map((record) => ({
      ...record,
      organizations: record._count.memberships,
    }));
  }

  async audit() {
    const [events, organizations] = await Promise.all([
      this.prisma.activityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      this.prisma.organization.findMany({ select: { id: true, name: true } }),
    ]);
    const names = new Map(organizations.map((org) => [org.id, org.name]));
    return events.map((event) => ({
      id: event.id,
      type: event.type,
      message: event.message,
      organization: names.get(event.organizationId) ?? "Unknown",
      createdAt: event.createdAt,
    }));
  }

  async setSystemRole(actorId: string, userId: string, systemRole: string) {
    if (actorId === userId && systemRole !== "PLATFORM_ADMIN") {
      throw new BadRequestException("You cannot demote your own platform admin account");
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("User not found");
    return this.prisma.user.update({
      where: { id: userId },
      data: { systemRole },
      select: { id: true, email: true, systemRole: true },
    });
  }
}
