import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(userId: string, name: string) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const slug = `${base || "organization"}-${Math.random().toString(36).slice(2, 8)}`;

    return this.prisma.organization.create({
      data: {
        name: name.trim(),
        slug,
        memberships: {
          create: { userId, role: "OWNER" },
        },
      },
      include: { memberships: true },
    });
  }

  async assertMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new ForbiddenException("You are not a member of this organization");
    return membership;
  }

  async current(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: { select: { jobs: true, candidates: true } },
      },
    });
    if (!organization) throw new NotFoundException("Organization not found");
    return organization;
  }

  members(organizationId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }
}
