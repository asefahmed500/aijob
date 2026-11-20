import { Module } from "@nestjs/common";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PrismaModule } from "../prisma/prisma.module";
import { InvitationsController } from "./invitations.controller";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

@Module({
  imports: [PrismaModule, OrganizationsModule],
  controllers: [TeamsController, InvitationsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
