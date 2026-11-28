import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { FileStorage } from "./storage";

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map<string, { extension: string; magic: (bytes: Buffer) => boolean }>([
  [
    "application/pdf",
    { extension: ".pdf", magic: (bytes) => bytes.subarray(0, 4).toString("latin1") === "%PDF" },
  ],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    { extension: ".docx", magic: (bytes) => bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04 },
  ],
  [
    "application/msword",
    { extension: ".doc", magic: (bytes) => bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0 },
  ],
]);

const AGENTS = ["cv_parsing", "skills_analysis", "experience_evaluation", "job_matching"] as const;
const SKILL_TOKENS = [
  "node.js", "nodejs", "typescript", "javascript", "nestjs", "postgresql", "postgres",
  "react", "aws", "docker", "jwt", "rest api", "graphql", "redis", "python", "git",
];

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorage,
  ) {}

  async list(organizationId: string, candidateId: string) {
    await this.assertCandidate(organizationId, candidateId);
    return this.prisma.candidateDocument.findMany({
      where: { organizationId, candidateId },
      orderBy: { createdAt: "desc" },
      include: { jobs: { orderBy: { createdAt: "desc" }, include: { executions: true } } },
    });
  }

  async get(organizationId: string, documentId: string) {
    const document = await this.prisma.candidateDocument.findFirst({
      where: { id: documentId, organizationId },
      include: { jobs: { orderBy: { createdAt: "desc" }, include: { executions: true } } },
    });
    if (!document) throw new NotFoundException("CV document not found");
    return document;
  }

  async upload(organizationId: string, candidateId: string, file: UploadedFile) {
    const candidate = await this.assertCandidate(organizationId, candidateId);
    const kind = ALLOWED.get(file.mimetype);
    if (!kind) {
      throw new BadRequestException("Only PDF, DOC and DOCX CV files are accepted");
    }
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException("Uploaded file is empty");
    }
    if (file.buffer.length > MAX_BYTES) {
      throw new BadRequestException("CV file exceeds the 10 MB limit");
    }
    if (!kind.magic(file.buffer)) {
      throw new BadRequestException("File content does not match its declared type");
    }

    const { createHash } = await import("node:crypto");
    const sha256 = createHash("sha256").update(file.buffer).digest("hex");
    const duplicate = await this.prisma.candidateDocument.findUnique({
      where: { candidateId_sha256: { candidateId, sha256 } },
    });
    if (duplicate) {
      throw new ConflictException("This CV has already been uploaded for this candidate");
    }

    const objectId = randomUUID();
    const storageKey = `candidates/${candidateId}/original/${objectId}${kind.extension}`;
    await this.storage.put(storageKey, file.buffer);

    const document = await this.prisma.candidateDocument.create({
      data: {
        organizationId,
        candidateId,
        filename: path.basename(file.originalname).slice(0, 200) || `cv${kind.extension}`,
        mimeType: file.mimetype,
        sizeBytes: file.buffer.length,
        sha256,
        storageKey,
        storageProvider: this.storage.provider,
        status: "QUEUED",
      },
    });
    const job = await this.prisma.processingJob.create({
      data: { documentId: document.id, type: "cv_processing", status: "QUEUED" },
    });

    // Fire-and-forget: processing continues independently of the browser tab.
    void this.process(job.id, candidate.resumeText);
    return document;
  }

  async retry(organizationId: string, documentId: string) {
    const document = await this.get(organizationId, documentId);
    if (document.status === "COMPLETED") {
      throw new BadRequestException("This CV has already been processed");
    }
    const job = await this.prisma.processingJob.create({
      data: { documentId: document.id, type: "cv_processing", status: "QUEUED" },
    });
    const candidate = await this.prisma.candidate.findUniqueOrThrow({
      where: { id: document.candidateId },
    });
    void this.process(job.id, candidate.resumeText);
    return job;
  }

  async download(organizationId: string, documentId: string) {
    const document = await this.get(organizationId, documentId);
    return {
      filename: document.filename,
      mimeType: document.mimeType,
      bytes: await this.storage.get(document.storageKey),
    };
  }

  private async assertCandidate(organizationId: string, candidateId: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
    });
    if (!candidate) throw new NotFoundException("Candidate not found");
    return candidate;
  }

  /** Fake adapter: deterministic stages and locally derived, labelled results. */
  private async process(jobId: string, sourceText: string): Promise<void> {
    const job = await this.prisma.processingJob.findUniqueOrThrow({ where: { id: jobId } });
    const stages = ["UPLOADED", "VALIDATING", "EXTRACTING", "PARSING", "ANALYZING", "COMPLETED"];
    try {
      for (const stage of stages) {
        await this.prisma.processingJob.update({ where: { id: jobId }, data: { status: stage } });
        await this.prisma.candidateDocument.update({
          where: { id: job.documentId },
          data: { status: stage },
        });
        await new Promise((resolve) => setTimeout(resolve, 15));
      }

      const lower = sourceText.toLowerCase();
      const skills = SKILL_TOKENS.filter((token) => lower.includes(token));
      const summary = sourceText.split("\n").map((line) => line.trim()).filter(Boolean)[0] ?? sourceText.slice(0, 200);
      const outputs: Record<string, object> = {
        cv_parsing: { source: "fake", summary, fieldsFound: { name: false, email: false, phone: false } },
        skills_analysis: { source: "fake", skills, evidenceQuote: skills[0] ? sourceText.split("\n").find((l) => l.toLowerCase().includes(skills[0])) ?? null : null },
        experience_evaluation: { source: "fake", years: null, note: "Not inferred without dated evidence" },
        job_matching: { source: "fake", matches: skills.map((skill) => ({ skill, requirement: skill })) },
      };

      for (const agentKey of AGENTS) {
        await this.prisma.agentExecution.create({
          data: {
            jobId,
            agentKey,
            status: "COMPLETED",
            source: "fake",
            model: "deterministic-local-adapter",
            promptVersion: "fake-v1",
            output: outputs[agentKey],
          },
        });
      }
      await this.prisma.candidateDocument.update({
        where: { id: job.documentId },
        data: {
          extractedText: sourceText,
          extractionNote: "fake-adapter: binary text extraction unavailable; stored resume text used",
          error: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Processing failed";
      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: { status: "FAILED", error: message, attempts: { increment: 1 } },
      });
      await this.prisma.candidateDocument.update({
        where: { id: job.documentId },
        data: { status: "FAILED", error: message },
      });
    }
  }
}
