import { Module } from "@nestjs/common";
import { ApplicationsModule } from "../applications/applications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AiModule } from "../ai/ai.module";
import { LetterController } from "./letter.controller";
import { LetterService } from "./letter.service";

@Module({
  imports: [PrismaModule, ApplicationsModule, AiModule],
  controllers: [LetterController],
  providers: [LetterService],
  exports: [LetterService],
})
export class LetterModule {}
