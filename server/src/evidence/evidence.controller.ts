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
import { EvidenceService } from "./evidence.service";
import { ReviewEvidenceDto } from "./dto/evidence.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Get("applications/:id/evidence")
  list(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.evidence.list(user.userId, id);
  }

  @Post("applications/:id/evidence/extract")
  extract(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.evidence.extract(user.userId, id);
  }

  @Patch("evidence/:evidenceId")
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param("evidenceId") evidenceId: string,
    @Body() dto: ReviewEvidenceDto,
  ) {
    return this.evidence.review(user.userId, evidenceId, dto.approved ?? true, dto.claim);
  }

  @Delete("evidence/:evidenceId")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("evidenceId") evidenceId: string) {
    return this.evidence.remove(user.userId, evidenceId);
  }
}
