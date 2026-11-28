import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { OrgGuard, OrgId } from "../organizations/org-context";
import { RolesGuard } from "../organizations/roles";
import { Policy } from "../auth/abac/policy.decorator";
import { DocumentsService, type UploadedFile as UploadedCvFile } from "./documents.service";

@Controller()
@UseGuards(JwtAuthGuard, OrgGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get("candidates/:id/documents")
  @Policy("candidate", "read")
  list(@OrgId() organizationId: string, @Param("id") candidateId: string) {
    return this.documents.list(organizationId, candidateId);
  }

  @Post("candidates/:id/documents")
  @Policy("candidate", "create")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @OrgId() organizationId: string,
    @Param("id") candidateId: string,
    @UploadedFile() file?: UploadedCvFile,
  ) {
    if (!file) throw new BadRequestException("A CV file is required");
    return this.documents.upload(organizationId, candidateId, file);
  }

  @Get("documents/:id")
  @Policy("candidate", "read")
  get(@OrgId() organizationId: string, @Param("id") documentId: string) {
    return this.documents.get(organizationId, documentId);
  }

  @Get("documents/:id/download")
  @Policy("candidate", "read")
  async download(
    @OrgId() organizationId: string,
    @Param("id") documentId: string,
    @Res() response: Response,
  ) {
    const file = await this.documents.download(organizationId, documentId);
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename="${file.filename.replace(/"/g, "")}"`);
    response.send(file.bytes);
  }

  @Post("documents/:id/retry")
  @Policy("candidate", "create")
  retry(@OrgId() organizationId: string, @Param("id") documentId: string) {
    return this.documents.retry(organizationId, documentId);
  }
}
