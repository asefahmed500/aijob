/* eslint-disable @typescript-eslint/no-require-imports */
/* Direct read-only verification against the app's SQLite database for QA audits. */
const path = require("node:path");

function openPrisma() {
  const { PrismaClient } = require(
    path.join(__dirname, "..", "server", "generated", "prisma"),
  );
  const { PrismaBetterSqlite3 } = require(
    path.join(__dirname, "..", "server", "node_modules", "@prisma", "adapter-better-sqlite3"),
  );
  const dbFile = path.join(__dirname, "..", "server", "dev.db").replace(/\\/g, "/");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbFile}` });
  return new PrismaClient({ adapter });
}

async function main() {
  const command = process.argv[2] ?? "counts";
  const prisma = openPrisma();
  try {
    if (command === "counts") {
      const result = {
        users: await prisma.user.count(),
        organizations: await prisma.organization.count(),
        memberships: await prisma.membership.count(),
        jobs: await prisma.jobPost.count(),
        candidates: await prisma.candidate.count(),
        applications: await prisma.application.count(),
        emails: await prisma.emailSource.count(),
        evidence: await prisma.evidence.count(),
        letters: await prisma.coverLetter.count(),
        candidateApplications: await prisma.candidateApplication.count(),
        scores: await prisma.candidateScore.count(),
        cvs: await prisma.candidateCv.count(),
        notes: await prisma.candidateNote.count(),
        notifications: await prisma.notificationLog.count(),
        invitations: await prisma.invitation.count(),
        cvDocuments: await prisma.candidateDocument.count(),
        processingJobs: await prisma.processingJob.count(),
        agentExecutions: await prisma.agentExecution.count(),
        passwordResetTokens: await prisma.passwordResetToken.count(),
      };
      console.log(JSON.stringify(result, null, 2));
    } else if (command === "by-email") {
      const email = process.argv[3];
      const user = await prisma.user.findUnique({
        where: { email },
        include: { applications: { include: { emails: true, evidence: true, letters: true } } },
      });
      console.log(JSON.stringify(user, null, 2));
    } else if (command === "job-by-title") {
      const title = process.argv[3];
      const jobs = await prisma.jobPost.findMany({
        where: { title },
        include: { applications: true },
      });
      console.log(JSON.stringify(jobs, null, 2));
    } else if (command === "candidate-by-email") {
      const email = process.argv[3];
      const rows = await prisma.candidate.findMany({
        where: { email },
        include: { applications: { include: { scores: { include: { evidences: true } } } } },
      });
      console.log(JSON.stringify(rows, null, 2));
    } else {
      throw new Error(`unknown command: ${command}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
