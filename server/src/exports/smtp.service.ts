import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { ExportArtifact } from "./exporters";

@Injectable()
export class SmtpService {
  isConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  async send(recipient: string, subject: string, artifact: ExportArtifact): Promise<void> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException("SMTP is not configured");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: recipient,
      subject,
      text: artifact.contentType.startsWith("text/plain") ? artifact.content : undefined,
      attachments: [
        {
          filename: artifact.filename,
          contentType: artifact.contentType,
          content: artifact.contentType.startsWith("text/")
            ? Buffer.from(artifact.content, "utf8")
            : Buffer.from(artifact.content, "base64"),
        },
      ],
    });
  }
}
