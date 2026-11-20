import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ApplicationsModule } from "./applications/applications.module";
import { EmailsModule } from "./emails/emails.module";
import { EvidenceModule } from "./evidence/evidence.module";
import { LetterModule } from "./letter/letter.module";
import { AiModule } from "./ai/ai.module";
import { ExportsModule } from "./exports/exports.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { JobsModule } from "./jobs/jobs.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { ScoringModule } from "./scoring/scoring.module";
import { PipelineModule } from "./pipeline/pipeline.module";
import { TeamsModule } from "./teams/teams.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { PublicApplyModule } from "./public-apply/public-apply.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
    }),
    PrismaModule,
    AiModule,
    AuthModule,
    ApplicationsModule,
    EmailsModule,
    EvidenceModule,
    LetterModule,
    ExportsModule,
    OrganizationsModule,
    JobsModule,
    CandidatesModule,
    ScoringModule,
    PipelineModule,
    TeamsModule,
    AnalyticsModule,
    PublicApplyModule,
  ],
})
export class AppModule {}
