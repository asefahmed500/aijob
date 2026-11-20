import "dotenv/config";
import { randomUUID } from "node:crypto";
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

const REQUIREMENTS = [
  "Strong experience with Node.js and TypeScript.",
  "PostgreSQL database design and query optimization.",
  "REST API design and JWT authentication.",
  "Experience with NestJS framework.",
  "Ability to integrate external APIs and AI services.",
];

const CANDIDATES = [
  {
    name: "Alex Morgan",
    email: "alex@example.com",
    resumeText: [
      "Built a REST API in NestJS and TypeScript serving 20k requests per day.",
      "Designed PostgreSQL schemas and improved query latency by 40% through indexing.",
      "Implemented JWT authentication and role-based access control for internal APIs.",
      "Integrated an external AI service for document classification.",
    ].join("\n"),
  },
  {
    name: "Sam Rivera",
    email: "sam@example.com",
    resumeText: [
      "Frontend developer with five years of React and CSS experience.",
      "Built responsive marketing pages and a component library.",
      "Worked with REST APIs on the client side.",
    ].join("\n"),
  },
  {
    name: "Jordan Lee",
    email: "jordan@example.com",
    resumeText: [
      "Backend engineer with Node.js and TypeScript services in production.",
      "Used PostgreSQL and REST API design for a payments platform.",
      "Familiar with NestJS modules and dependency injection.",
    ].join("\n"),
  },
];

async function main() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo Candidate",
        passwordHash: DEMO_PASSWORD_HASH,
      },
    });
  }

  let application = await prisma.application.findFirst({ where: { userId: user.id } });
  if (!application) {
    application = await prisma.application.create({
      data: { userId: user.id, company: "Example Company", role: "Backend Engineer" },
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
  }

  let organization = await prisma.organization.findUnique({
    where: { slug: "example-company-seed" },
  });
  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: "Example Company",
        slug: "example-company-seed",
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
    });
  }

  let job = await prisma.jobPost.findFirst({
    where: { organizationId: organization.id, title: "Backend Engineer" },
  });
  if (!job) {
    job = await prisma.jobPost.create({
      data: {
        organizationId: organization.id,
        title: "Backend Engineer",
        description: "We are hiring a backend engineer to build AI-powered services.",
        requirements: REQUIREMENTS.join("\n"),
      },
    });
  }

  if (!job.publicToken) {
    job = await prisma.jobPost.update({
      where: { id: job.id },
      data: { publicToken: randomUUID() },
    });
  }

  for (const candidate of CANDIDATES) {
    const existing = await prisma.candidate.findFirst({
      where: { organizationId: organization.id, email: candidate.email },
    });
    const record =
      existing ??
      (await prisma.candidate.create({
        data: { organizationId: organization.id, ...candidate },
      }));
    const applied = await prisma.candidateApplication.findUnique({
      where: { jobId_candidateId: { jobId: job.id, candidateId: record.id } },
    });
    if (!applied) {
      await prisma.candidateApplication.create({
        data: { jobId: job.id, candidateId: record.id },
      });
    }
  }

  console.log(`Seed complete: user=${user.id} organization=${organization.id} job=${job.id}`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
