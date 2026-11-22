import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { Policy } from "../auth/abac/policy.decorator";
import { RolesGuard } from "../organizations/roles";
import { AdminService } from "./admin.service";
import { UpdateSystemRoleDto } from "./dto/admin.dto";

/** Platform-level administration. No active-organization context is required. */
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("overview")
  @Policy("admin", "read")
  overview() {
    return this.admin.overview();
  }

  @Get("organizations")
  @Policy("admin", "read")
  organizations() {
    return this.admin.organizations();
  }

  @Get("users")
  @Policy("admin", "read")
  users() {
    return this.admin.users();
  }

  @Get("audit")
  @Policy("admin", "read")
  audit() {
    return this.admin.audit();
  }

  @Patch("users/:userId/system-role")
  @Policy("admin", "manage")
  setSystemRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() dto: UpdateSystemRoleDto,
  ) {
    return this.admin.setSystemRole(user.userId, userId, dto.systemRole);
  }
}
