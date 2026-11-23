import { IsEmail, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class PublicApplyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(50000)
  resumeText!: string;

  /** Answers to the recruiter's custom form questions, keyed by field id. */
  @IsOptional()
  @IsObject()
  answers?: Record<string, string>;
}
