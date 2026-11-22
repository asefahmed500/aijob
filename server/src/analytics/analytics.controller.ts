import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { OrgGuard, OrgId } from "../organizations/org-context";
import { AnalyticsService } from "./analytics.service";
import { Policy } from "../auth/abac/policy.decorator";
import { RolesGuard } from "../organizations/roles";

@Controller("analytics")
@UseGuards(JwtAuthGuard, OrgGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  @Policy("analytics", "read")
  summary(@OrgId() organizationId: string) {
    return this.analytics.summary(organizationId);
  }
}
