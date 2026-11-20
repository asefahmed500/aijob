import { IsString } from "class-validator";

export class GenerateLetterDto {
  @IsString()
  applicationId!: string;
}
