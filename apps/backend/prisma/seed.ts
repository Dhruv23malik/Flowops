import prisma from '../db';
import { DEMO_WORKFLOWS, seedDemoWorkflowsForUser } from '../services/demo-templates';

/**
 * Seed script for local development and one-off runs against a real DB:
 *   DATABASE_URL=... npx tsx apps/backend/prisma/seed.ts
 *
 * Creates (or reuses) a `demo@flowops.local` user and gives it the same
 * 3 demo workflows guests get on signup. Idempotent: re-running it first
 * deletes that user's existing workflows (executions cascade).
 *
 * Add to package.json as: "seed": "tsx prisma/seed.ts"
 */
async function main(): Promise<void> {
  const email = 'demo@flowops.local';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Demo User',
      email,
      // Not a real login password — this account exists only to own seed data.
      // Guests get their own fresh accounts via POST /api/auth/guest.
      passwordHash: 'seeded-demo-account-not-for-login',
    },
  });

  await prisma.workflow.deleteMany({ where: { userId: user.id } });
  await seedDemoWorkflowsForUser(user.id);

  console.log(`Seeded ${DEMO_WORKFLOWS.length} demo workflows for ${email}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
