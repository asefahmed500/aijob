import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@aijob.local";
const DEMO_PASSWORD_HASH =
  "$2b$10$s5a5PkPc5vPF6hS2789jUemTL8QUn62oBahpiUXu3xsamomrpEWDe"; // bcrypt of "demo12345"

const SAMPLE_EMAILS = [
  `From: careers@example-company.com\nSubject: Backend Engineer opportunity\nDate: 2026-11-10T09:00:00Z\n\nWe are looking for a Backend Engineer with strong experience in Node.js and PostgreSQL.\nRequired skills include REST API design, authentication, and database modeling.\nYou will work on AI-powered services and integrate external APIs.\nExperience with NestJS is a plus.`,
  `From: manager@example.com\nSubject: Project status update\nDate: 2026-11-12T15:30:00Z\n\nBuilt a REST API in NestJS that serves 20k requests per day.\nLed a team of three engineers to migrate a legacy service to PostgreSQL.\nImproved query latency by 40% through schema redesign and indexing.\nImplemented JWT authentication with role-based access control.`,
  `From: recruiter@example-company.com\nSubject: Interview confirmation\nDate: 2026-11-15T11:00:00Z\n\nYour interview for the Software Engineer role is confirmed for Friday.\nPlease bring examples of systems you designed and operated.`,
];

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log("Seed skipped: demo user already exists");
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo Candidate",
      passwordHash: DEMO_PASSWORD_HASH,
    },
  });

  const application = await prisma.application.create({
    data: {
      userId: user.id,
      company: "Example Company",
      role: "Backend Engineer",
    },
  });

  for (const rawBody of SAMPLE_EMAILS) {
    await prisma.emailSource.create({
      data: {
        applicationId: application.id,
        rawBody,
        normalizedBody: rawBody.split("\n\n").slice(1).join("\n\n"),
        subject: /Subject: (.*)/.exec(rawBody)?.[1] ?? null,
        fromAddress: /From: (.*)/.exec(rawBody)?.[1] ?? null,
      },
    });
  }

  console.log(`Seed complete: user=${user.id} application=${application.id}`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
