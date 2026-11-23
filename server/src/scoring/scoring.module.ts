import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { PrismaModule } from "../prisma/prisma.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { ScoringController } from "./scoring.controller";
import { ScoringService } from "./scoring.service";

@Module({
  imports: [PrismaModule, OrganizationsModule, AiModule],
  controllers: [ScoringController],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
