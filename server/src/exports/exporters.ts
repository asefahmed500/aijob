import { Document, Packer, Paragraph, TextRun } from "docx";

export interface ExportArtifact {
  content: string;
  contentType: string;
  filename: string;
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function toMarkdown(
  content: string,
  company: string,
  role: string,
): ExportArtifact {
  return {
    content: `# Cover letter — ${role} at ${company}\n\n${content}\n`,
    contentType: "text/markdown; charset=utf-8",
    filename: `cover-letter-${safeName(company)}.md`,
  };
}

export function toPlainText(content: string): ExportArtifact {
  return {
    content,
    contentType: "text/plain; charset=utf-8",
    filename: "cover-letter.txt",
  };
}

export function toPrintHtml(
  content: string,
  company: string,
  role: string,
): ExportArtifact {
  const escaped = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((block) => `<p>${escaped(block).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  return {
    content: `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Cover letter — ${escaped(role)} at ${escaped(company)}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:48px auto;line-height:1.6;color:#111}@media print{body{margin:0}}</style></head><body>${paragraphs}</body></html>`,
    contentType: "text/html; charset=utf-8",
    filename: "cover-letter-print.html",
  };
}

export async function toDocx(
  content: string,
  company: string,
  role: string,
): Promise<ExportArtifact> {
  const children = content
    .split(/\n\s*\n/)
    .flatMap((block) => [
      new Paragraph({ children: [new TextRun(block.replace(/\n/g, " "))] }),
      new Paragraph({ text: "" }),
    ]);

  const document = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: `${role} — ${company}`, bold: true, size: 28 })],
          }),
          new Paragraph({ text: "" }),
          ...children,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  return {
    content: buffer.toString("base64"),
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: `cover-letter-${safeName(company)}.docx`,
  };
}
