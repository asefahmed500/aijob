import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { TeamsService } from "./teams.service";
import { AcceptInviteDto } from "./dto/team.dto";

@Controller("invitations")
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly teams: TeamsService) {}

  @Post("accept")
  accept(@CurrentUser() user: AuthenticatedUser, @Body() dto: AcceptInviteDto) {
    return this.teams.accept(dto.token, user.userId);
  }
}
