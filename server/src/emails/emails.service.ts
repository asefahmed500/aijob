import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ApplicationsService } from "../applications/applications.service";
import { parseEmail } from "./email-parser";

@Injectable()
export class EmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applications: ApplicationsService,
  ) {}

  async list(userId: string, applicationId: string) {
    await this.applications.findOwned(userId, applicationId);
    return this.prisma.emailSource.findMany({
      where: { applicationId },
      orderBy: { createdAt: "asc" },
    });
  }

  async add(
    userId: string,
    applicationId: string,
    rawBody: string,
    filename?: string,
  ) {
    await this.applications.findOwned(userId, applicationId);
    const parsed = parseEmail(rawBody);
    return this.prisma.emailSource.create({
      data: {
        applicationId,
        subject: parsed.subject ?? filename ?? null,
        fromAddress: parsed.fromAddress,
        receivedAt: parsed.receivedAt,
        rawBody,
        normalizedBody: parsed.normalizedBody,
      },
    });
  }

  async addMany(userId: string, applicationId: string, bodies: string[]) {
    await this.applications.findOwned(userId, applicationId);
    const created: string[] = [];
    for (const body of bodies) {
      const email = await this.add(userId, applicationId, body);
      created.push(email.id);
    }
    return created;
  }
}
