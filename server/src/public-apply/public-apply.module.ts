import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PublicApplyController } from "./public-apply.controller";
import { PublicApplyService } from "./public-apply.service";

@Module({
  imports: [PrismaModule],
  controllers: [PublicApplyController],
  providers: [PublicApplyService],
})
export class PublicApplyModule {}
