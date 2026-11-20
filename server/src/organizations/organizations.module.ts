import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OrgGuard } from "./org-context";
import { RolesGuard } from "./roles";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrgGuard, RolesGuard],
  exports: [OrganizationsService, OrgGuard, RolesGuard],
})
export class OrganizationsModule {}
