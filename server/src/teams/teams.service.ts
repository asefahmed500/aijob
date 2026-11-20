import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async invite(organizationId: string, invitedById: string, email: string, role: string) {
    const normalized = email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existingUser) {
      const membership = await this.prisma.membership.findUnique({
        where: { userId_organizationId: { userId: existingUser.id, organizationId } },
      });
      if (membership) throw new BadRequestException("User is already a member");
    }
    const pending = await this.prisma.invitation.findFirst({
      where: { organizationId, email: normalized, status: "pending" },
    });
    if (pending) throw new BadRequestException("An invitation is already pending");

    return this.prisma.invitation.create({
      data: { organizationId, email: normalized, role, invitedById },
    });
  }

  async list(organizationId: string) {
    const [members, invitations] = await Promise.all([
      this.prisma.membership.findMany({
        where: { organizationId },
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
      this.prisma.invitation.findMany({
        where: { organizationId, status: "pending" },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { members, invitations };
  }

  async accept(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findFirst({ where: { token, status: "pending" } });
    if (!invitation) throw new NotFoundException("Invitation not found or already used");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== invitation.email) {
      throw new ForbiddenException("This invitation was sent to a different email address");
    }

    await this.prisma.$transaction([
      this.prisma.membership.upsert({
        where: {
          userId_organizationId: { userId, organizationId: invitation.organizationId },
        },
        create: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
        update: { role: invitation.role },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      }),
    ]);
    return { organizationId: invitation.organizationId, role: invitation.role };
  }

  async removeMember(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException("Member not found");
    if (membership.role === "OWNER") throw new ForbiddenException("The owner cannot be removed");
    await this.prisma.membership.delete({
      where: { userId_organizationId: { userId, organizationId } },
    });
    return { ok: true };
  }

  async updateRole(organizationId: string, userId: string, role: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException("Member not found");
    if (membership.role === "OWNER") throw new ForbiddenException("The owner role cannot be changed");
    return this.prisma.membership.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { role },
    });
  }

  async currentRole(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    return membership?.role ?? null;
  }
}
