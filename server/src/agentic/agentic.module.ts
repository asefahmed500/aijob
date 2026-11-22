import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AgenticService } from "./agentic.service";

@Module({
  imports: [PrismaModule, AiModule],
  providers: [AgenticService],
  exports: [AgenticService],
})
export class AgenticModule {}
