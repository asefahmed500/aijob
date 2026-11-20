import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { OrgGuard, OrgId } from "./org-context";
import { OrganizationsService } from "./organizations.service";
import { CreateOrganizationDto, SwitchOrganizationDto } from "./dto/organization.dto";

@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.listForUser(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrganizationDto) {
    return this.organizations.create(user.userId, dto.name);
  }

  @Post("switch")
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
  @UseGuards(OrgGuard)
  current(@OrgId() organizationId: string) {
    return this.organizations.current(organizationId);
  }

  @Get("members")
  @UseGuards(OrgGuard)
  members(@OrgId() organizationId: string) {
    return this.organizations.members(organizationId);
  }
}
