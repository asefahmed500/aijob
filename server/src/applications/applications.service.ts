import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApplicationDto } from "./dto/create-application.dto";

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { emails: true, evidence: true, letters: true },
        },
      },
    });
  }

  create(userId: string, dto: CreateApplicationDto) {
    return this.prisma.application.create({
      data: {
        userId,
        company: dto.company.trim(),
        role: dto.role.trim(),
      },
    });
  }

  async findOwned(userId: string, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });
    if (!application) {
      throw new NotFoundException("Application not found");
    }
    return application;
  }

  async get(userId: string, applicationId: string) {
    await this.findOwned(userId, applicationId);
    return this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        emails: { orderBy: { createdAt: "asc" } },
        evidence: { orderBy: { createdAt: "asc" } },
        letters: {
          orderBy: { version: "desc" },
          include: { claims: true },
        },
        exports: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async remove(userId: string, applicationId: string) {
    await this.findOwned(userId, applicationId);
    await this.prisma.application.delete({ where: { id: applicationId } });
    return { ok: true };
  }
}
