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
import { OrgGuard, OrgId } from "../organizations/org-context";
import { AgenticService } from "../agentic/agentic.service";
import { GenerateJobDraftDto } from "../agentic/dto/agentic.dto";
import { Policy } from "../auth/abac/policy.decorator";
import { RolesGuard } from "../organizations/roles";
import { JobsService } from "./jobs.service";
import { CreateJobDto, UpdateJobStatusDto } from "./dto/job.dto";

@Controller("jobs")
@UseGuards(JwtAuthGuard, OrgGuard, RolesGuard)
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly agentic: AgenticService,
  ) {}

  @Get()
  @Policy("job", "read")
  list(@OrgId() organizationId: string) {
    return this.jobs.list(organizationId);
  }

  @Post("generate")
  @Policy("job", "create")
  generate(@Body() dto: GenerateJobDraftDto) {
    return this.agentic.draftJobPost(dto.brief);
  }

  @Post()
  @Policy("job", "create")
  create(@OrgId() organizationId: string, @Body() dto: CreateJobDto) {
    return this.jobs.create(organizationId, dto);
  }

  @Get(":id")
  @Policy("job", "read")
  get(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.jobs.get(organizationId, id);
  }

  @Patch(":id/status")
  @Policy("job", "update")
  setStatus(
    @OrgId() organizationId: string,
    @Param("id") id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.jobs.setStatus(organizationId, id, dto.status);
  }

  @Delete(":id")
  @Policy("job", "delete")
  remove(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.jobs.remove(organizationId, id);
  }
}
