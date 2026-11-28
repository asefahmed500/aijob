import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { FileStorage, LocalFileStorage } from "./storage";

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, { provide: FileStorage, useClass: LocalFileStorage }],
  exports: [DocumentsService],
})
export class DocumentsModule {}
