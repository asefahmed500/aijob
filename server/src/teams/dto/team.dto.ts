import { IsEmail, IsIn, IsString } from "class-validator";

export const ORGANIZATION_ROLES = ["OWNER", "RECRUITER", "VIEWER"] as const;

export class InviteDto {
  @IsEmail()
  email!: string;

  @IsIn(ORGANIZATION_ROLES)
  role!: string;
}

export class UpdateRoleDto {
  @IsIn(ORGANIZATION_ROLES)
  role!: string;
}

export class AcceptInviteDto {
  @IsString()
  token!: string;
}
