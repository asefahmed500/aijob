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
  ],
})
export class AppModule {}
