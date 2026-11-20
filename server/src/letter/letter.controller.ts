import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { LetterService } from "./letter.service";

@Controller("applications/:id/letter")
@UseGuards(JwtAuthGuard)
export class LetterController {
  constructor(private readonly letter: LetterService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.letter.list(user.userId, id);
  }

  @Get("latest")
  latest(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.letter.latest(user.userId, id);
  }

  @Post("generate")
  generate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.letter.generate(user.userId, id);
  }
}
