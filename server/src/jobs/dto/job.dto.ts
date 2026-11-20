import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateJobDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  description!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  requirements!: string;
}
