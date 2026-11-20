import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { OrgGuard, OrgId } from "../organizations/org-context";
import { Roles, RolesGuard } from "../organizations/roles";
import { PipelineService } from "./pipeline.service";
import { AddNoteDto, BulkStageDto, UpdateStageDto } from "./dto/pipeline.dto";

@Controller("pipeline")
@UseGuards(JwtAuthGuard, OrgGuard, RolesGuard)
export class PipelineController {
  constructor(private readonly pipeline: PipelineService) {}

  @Patch("applications/:id/stage")
  @Roles("OWNER", "RECRUITER")
  updateStage(
    @OrgId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.pipeline.updateStage(organizationId, id, user.userId, dto.stage, dto.rating);
  }

  @Post("applications/:id/notes")
  addNote(
    @OrgId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.pipeline.addNote(organizationId, id, user.userId, dto.body);
  }

  @Get("applications/:id/notes")
  notes(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.pipeline.notes(organizationId, id);
  }

  @Get("applications/:id/timeline")
  timeline(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.pipeline.timeline(organizationId, id);
  }

  @Get("notifications")
  notifications(@OrgId() organizationId: string) {
    return this.pipeline.notifications(organizationId);
  }

  @Post("bulk-stage")
  @Roles("OWNER", "RECRUITER")
  bulkStage(
    @OrgId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkStageDto,
  ) {
    return this.pipeline.bulkStage(organizationId, dto.applicationIds, dto.stage, user.userId);
  }
}
