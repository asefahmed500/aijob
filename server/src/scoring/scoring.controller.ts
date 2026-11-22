import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { OrgGuard, OrgId } from "../organizations/org-context";
import { Policy } from "../auth/abac/policy.decorator";
import { RolesGuard } from "../organizations/roles";
import { ScoringService } from "./scoring.service";

@Controller("scoring")
@UseGuards(JwtAuthGuard, OrgGuard, RolesGuard)
export class ScoringController {
  constructor(private readonly scoring: ScoringService) {}

  @Post("applications/:id/score")
  @Policy("scoring", "create")
  scoreApplication(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.scoring.scoreApplication(organizationId, id);
  }

  @Post("jobs/:id/score-all")
  @Policy("scoring", "create")
  scoreJob(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.scoring.scoreJob(organizationId, id);
  }
}
