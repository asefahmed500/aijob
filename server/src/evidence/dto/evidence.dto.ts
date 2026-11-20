import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class ExtractEvidenceDto {
  @IsString()
  applicationId!: string;
}

export class ReviewEvidenceDto {
  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  claim?: string;
}
