import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ExportArtifact, toDocx, toMarkdown, toPlainText, toPrintHtml } from "./exporters";
import { ExportDto, ExportFormat, SendExportDto } from "./dto/export.dto";
import { SmtpService } from "./smtp.service";

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smtp: SmtpService,
  ) {}

  private async loadContext(userId: string, applicationId: string, letterId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });
    if (!application) throw new NotFoundException("Application not found");

    const letter = await this.prisma.coverLetter.findFirst({
      where: { id: letterId, applicationId },
    });
    if (!letter) throw new NotFoundException("Cover letter not found");
    return { application, letter };
  }

  async produce(
    userId: string,
    applicationId: string,
    dto: ExportDto,
  ): Promise<ExportArtifact & { base64: boolean }> {
    const { application, letter } = await this.loadContext(
      userId,
      applicationId,
      dto.letterId,
    );
    let artifact: ExportArtifact;
    switch (dto.format) {
      case "markdown":
        artifact = toMarkdown(letter.content, application.company, application.role);
        break;
      case "clipboard":
        artifact = toPlainText(letter.content);
        break;
      case "print":
        artifact = toPrintHtml(letter.content, application.company, application.role);
        break;
      case "docx":
        artifact = await toDocx(letter.content, application.company, application.role);
        break;
      default:
        throw new BadRequestException("Unsupported export format");
    }

    await this.prisma.exportLog.create({
      data: {
        letterId: letter.id,
        applicationId,
        format: dto.format,
        status: "generated",
      },
    });

    return { ...artifact, base64: dto.format === "docx" };
  }

  async send(userId: string, applicationId: string, dto: SendExportDto) {
    const { application, letter } = await this.loadContext(
      userId,
      applicationId,
      dto.letterId,
    );
    const attachment = await toDocx(letter.content, application.company, application.role);
    const subject =
      dto.subject?.trim() ||
      `Cover letter — ${application.role} at ${application.company}`;

    await this.smtp.send(dto.recipient, subject, attachment);
    await this.prisma.exportLog.create({
      data: {
        letterId: letter.id,
        applicationId,
        format: "smtp",
        recipient: dto.recipient,
        status: "sent",
      },
    });
    return { ok: true };
  }

  async history(userId: string, applicationId: string) {
    await this.prisma.application.findFirstOrThrow({
      where: { id: applicationId, userId },
    });
    return this.prisma.exportLog.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export type { ExportFormat };
