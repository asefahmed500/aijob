import { Module } from "@nestjs/common";
import { ExportsModule } from "../exports/exports.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PipelineController } from "./pipeline.controller";
import { PipelineService } from "./pipeline.service";

@Module({
  imports: [PrismaModule, OrganizationsModule, ExportsModule],
  controllers: [PipelineController],
  providers: [PipelineService],
})
export class PipelineModule {}
