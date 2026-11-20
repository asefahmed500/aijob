import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export const EXPORT_FORMATS = ["markdown", "docx", "print", "clipboard"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export class ExportDto {
  @IsString()
  letterId!: string;

  @IsIn(EXPORT_FORMATS)
  format!: ExportFormat;
}

export class SendExportDto {
  @IsString()
  letterId!: string;

  @IsEmail()
  recipient!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;
}
