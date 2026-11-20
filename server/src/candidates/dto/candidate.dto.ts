import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class CreateCandidateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(50000)
  resumeText!: string;
}

export class ApplyCandidateDto {
  @IsString()
  candidateId!: string;

  @IsString()
  jobId!: string;
}
