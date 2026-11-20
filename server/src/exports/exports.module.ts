import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ExportsController } from "./exports.controller";
import { ExportsService } from "./exports.service";
import { SmtpService } from "./smtp.service";

@Module({
  imports: [PrismaModule],
  controllers: [ExportsController],
  providers: [ExportsService, SmtpService],
  exports: [SmtpService],
})
export class ExportsModule {}
