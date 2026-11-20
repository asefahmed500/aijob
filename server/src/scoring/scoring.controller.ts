import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { OrgGuard, OrgId } from "../organizations/org-context";
import { ScoringService } from "./scoring.service";

@Controller("scoring")
@UseGuards(JwtAuthGuard, OrgGuard)
export class ScoringController {
  constructor(private readonly scoring: ScoringService) {}

  @Post("applications/:id/score")
  scoreApplication(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.scoring.scoreApplication(organizationId, id);
  }

  @Post("jobs/:id/score-all")
  scoreJob(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.scoring.scoreJob(organizationId, id);
  }
}
