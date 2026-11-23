import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class FormFieldDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsIn(["text", "textarea", "url"])
  type?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;
}

/** Settings for the public, Google-Forms-style application link. */
export class JobFormDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  formFields?: FormFieldDto[];

  @IsOptional()
  @IsDateString()
  formExpiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  autoScreen?: boolean;
}

export class CreateJobDto extends JobFormDto {
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

  @IsOptional()
  @IsIn(["manual", "zai", "deterministic"])
  source?: string;
}

export class UpdateJobFormDto extends JobFormDto {}

export class UpdateJobStatusDto {
  @IsIn(["open", "closed"])
  status!: string;
}
