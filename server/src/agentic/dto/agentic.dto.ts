import { IsString, MaxLength, MinLength } from "class-validator";

export class GenerateJobDraftDto {
  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  brief!: string;
}
