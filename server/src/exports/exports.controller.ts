import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ExportsService } from "./exports.service";
import { ExportDto, SendExportDto } from "./dto/export.dto";

@Controller("applications/:id/export")
@UseGuards(JwtAuthGuard)
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Post()
  produce(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ExportDto,
  ) {
    return this.exports.produce(user.userId, id, dto);
  }

  @Post("send")
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SendExportDto,
  ) {
    return this.exports.send(user.userId, id, dto);
  }

  @Get("history")
  history(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.exports.history(user.userId, id);
  }
}
