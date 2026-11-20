import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateApplicationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  company!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  role!: string;
}
