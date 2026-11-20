import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { EmailsService } from "./emails.service";
import { AddEmailDto } from "./dto/add-email.dto";

@Controller("applications/:id/emails")
@UseGuards(JwtAuthGuard)
export class EmailsController {
  constructor(private readonly emails: EmailsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.emails.list(user.userId, id);
  }

  @Post()
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AddEmailDto,
  ) {
    return this.emails.add(user.userId, id, dto.rawBody, dto.filename);
  }
}
