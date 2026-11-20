import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AddEmailDto {
  @IsString()
  applicationId!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(100000)
  rawBody!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;
}
