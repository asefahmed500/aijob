import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { OrgGuard, OrgId } from "./org-context";
import { OrganizationsService } from "./organizations.service";
import { CreateOrganizationDto, SwitchOrganizationDto } from "./dto/organization.dto";
import { Policy } from "../auth/abac/policy.decorator";
import { RolesGuard } from "./roles";

@Controller("organizations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  @Policy("organization", "read")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.listForUser(user.userId);
  }

  @Post()
  @Policy("organization", "create")
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrganizationDto) {
    return this.organizations.create(user.userId, dto.name);
  }

  @Post("switch")
  @Policy("organization", "switch")
  async switch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SwitchOrganizationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.organizations.assertMembership(user.userId, dto.organizationId);
    res.cookie("active_org", dto.organizationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { ok: true };
  }

  @Get("current")
  @Policy("organization", "read")
  @UseGuards(OrgGuard)
  current(@OrgId() organizationId: string) {
    return this.organizations.current(organizationId);
  }

  @Get("members")
  @Policy("organization", "read")
  @UseGuards(OrgGuard)
  members(@OrgId() organizationId: string) {
    return this.organizations.members(organizationId);
  }
}
