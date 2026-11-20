import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { OrgGuard, OrgId } from "../organizations/org-context";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dto/job.dto";

@Controller("jobs")
@UseGuards(JwtAuthGuard, OrgGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@OrgId() organizationId: string) {
    return this.jobs.list(organizationId);
  }

  @Post()
  create(@OrgId() organizationId: string, @Body() dto: CreateJobDto) {
    return this.jobs.create(organizationId, dto);
  }

  @Get(":id")
  get(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.jobs.get(organizationId, id);
  }

  @Delete(":id")
  remove(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.jobs.remove(organizationId, id);
  }
}
