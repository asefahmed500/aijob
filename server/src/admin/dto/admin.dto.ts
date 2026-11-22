import { IsIn } from "class-validator";

export class UpdateSystemRoleDto {
  @IsIn(["USER", "PLATFORM_ADMIN"])
  systemRole!: "USER" | "PLATFORM_ADMIN";
}
