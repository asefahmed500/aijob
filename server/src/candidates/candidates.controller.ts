import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { OrgGuard, OrgId } from "../organizations/org-context";
import { CandidatesService } from "./candidates.service";
import { ApplyCandidateDto, CreateCandidateDto } from "./dto/candidate.dto";
import { Policy } from "../auth/abac/policy.decorator";
import { RolesGuard } from "../organizations/roles";

@Controller("candidates")
@UseGuards(JwtAuthGuard, OrgGuard, RolesGuard)
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Get()
  @Policy("candidate", "read")
  list(@OrgId() organizationId: string) {
    return this.candidates.list(organizationId);
  }

  @Post()
  @Policy("candidate", "create")
  create(@OrgId() organizationId: string, @Body() dto: CreateCandidateDto) {
    return this.candidates.create(organizationId, dto);
  }

  @Get("search")
  @Policy("candidate", "read")
  search(
    @OrgId() organizationId: string,
    @Query("q") q?: string,
    @Query("stage") stage?: string,
    @Query("jobId") jobId?: string,
    @Query("minScore") minScore?: string,
    @Query("sort") sort?: "score" | "name" | "recent",
  ) {
    return this.candidates.search(organizationId, {
      q,
      stage,
      jobId,
      minScore: minScore !== undefined ? Number(minScore) : undefined,
      sort,
    });
  }

  @Get(":id")
  @Policy("candidate", "read")
  get(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.candidates.get(organizationId, id);
  }

  @Post(":id/cv/generate")
  @Policy("cv", "create")
  generateCv(@OrgId() organizationId: string, @Param("id") id: string) {
    return this.candidates.generateCv(organizationId, id);
  }

  @Post("apply")
  @Policy("candidate", "create")
  apply(@OrgId() organizationId: string, @Body() dto: ApplyCandidateDto) {
    return this.candidates.apply(organizationId, dto.candidateId, dto.jobId);
  }

  @Get("ranking/:jobId")
  @Policy("candidate", "read")
  ranking(@OrgId() organizationId: string, @Param("jobId") jobId: string) {
    return this.candidates.ranking(organizationId, jobId);
  }
}
