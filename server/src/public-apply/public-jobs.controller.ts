import { Controller, Get, Param } from "@nestjs/common";
import { PublicApplyService } from "./public-apply.service";

/** Unauthenticated read of the job a candidate is applying to. */
@Controller("public/jobs")
export class PublicJobsController {
  constructor(private readonly publicApply: PublicApplyService) {}

  @Get(":token")
  get(@Param("token") token: string) {
    return this.publicApply.getJob(token);
  }
}
