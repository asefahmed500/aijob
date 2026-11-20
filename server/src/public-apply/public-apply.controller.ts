import { Body, Controller, Param, Post } from "@nestjs/common";
import { PublicApplyService } from "./public-apply.service";
import { PublicApplyDto } from "./dto/public-apply.dto";

@Controller("public/apply")
export class PublicApplyController {
  constructor(private readonly publicApply: PublicApplyService) {}

  @Post(":token")
  apply(@Param("token") token: string, @Body() dto: PublicApplyDto) {
    return this.publicApply.apply(token, dto);
  }
}
