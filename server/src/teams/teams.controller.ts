import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { OrgGuard, OrgId } from "../organizations/org-context";
import { Roles, RolesGuard } from "../organizations/roles";
import { TeamsService } from "./teams.service";
import { InviteDto, UpdateRoleDto } from "./dto/team.dto";

@Controller("teams")
@UseGuards(JwtAuthGuard, OrgGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(@OrgId() organizationId: string) {
    return this.teams.list(organizationId);
  }

  @Get("my-role")
  async myRole(
    @OrgId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { role: await this.teams.currentRole(user.userId, organizationId) };
  }

  @Post("invite")
  @Roles("OWNER", "RECRUITER")
  invite(
    @OrgId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteDto,
  ) {
    return this.teams.invite(organizationId, user.userId, dto.email, dto.role);
  }

  @Delete("members/:userId")
  @Roles("OWNER")
  removeMember(@OrgId() organizationId: string, @Param("userId") userId: string) {
    return this.teams.removeMember(organizationId, userId);
  }

  @Patch("members/:userId/role")
  @Roles("OWNER")
  updateRole(
    @OrgId() organizationId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.teams.updateRole(organizationId, userId, dto.role);
  }
}
