import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export const PIPELINE_STAGES = ["new", "screening", "interview", "offer", "rejected"] as const;

export class UpdateStageDto {
  @IsString()
  @MaxLength(40)
  stage!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class AddNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}

export class BulkStageDto {
  @IsArray()
  applicationIds!: string[];

  @IsString()
  @MaxLength(40)
  stage!: string;
}
