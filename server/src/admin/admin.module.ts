import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [PrismaModule, OrganizationsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
