import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Subscription plans ────────────────────────────────────────────────────
  const plans = [
    { slug: 'free', tier: 'Free' as const, name: 'Free', priceKobo: 0, billingPeriod: 'monthly', features: ['Basic health records', 'Emergency contacts', 'Appointment booking'], displayOrder: 0 },
    { slug: 'basic', tier: 'Basic' as const, name: 'Basic', priceKobo: 500000, billingPeriod: 'monthly', features: ['Everything in Free', 'Lab result tracking', 'Vitals monitoring', 'SMS alerts'], displayOrder: 1 },
    { slug: 'mid-level', tier: 'Mid_Level' as const, name: 'Mid-Level', priceKobo: 1000000, billingPeriod: 'monthly', features: ['Everything in Basic', 'TeleCare sessions (2/month)', 'Expert review access', 'Priority support'], displayOrder: 2 },
    { slug: 'gold', tier: 'Gold' as const, name: 'Gold', priceKobo: 2500000, billingPeriod: 'monthly', features: ['Everything in Mid-Level', 'Unlimited TeleCare', 'DispatchCare™', 'STRIDE™ AI triage', 'Dedicated care coordinator'], displayOrder: 3 },
    { slug: 'corporate', tier: 'Corporate' as const, name: 'Corporate', priceKobo: 0, billingPeriod: 'monthly', features: ['Custom pricing', 'Bulk patient management', 'Analytics dashboard', 'Dedicated account manager', 'SLA guarantees'], displayOrder: 4 },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: { priceKobo: plan.priceKobo, features: plan.features },
      create: { ...plan, features: plan.features },
    });
  }
  console.log(`✓ ${plans.length} subscription plans seeded`);

  // ── STRIDE phases ─────────────────────────────────────────────────────────
  const stridePhases = [
    { code: 'STRIDE-1', name: 'Emergency Triage', subtitle: 'AI-powered emergency assessment', version: '1.0.0', status: 'active' as const },
    { code: 'STRIDE-2', name: 'Dispatch Coordination', subtitle: 'Intelligent unit dispatch', version: '1.0.0', status: 'beta' as const },
    { code: 'STRIDE-3', name: 'Facility Matching', subtitle: 'Real-time bed availability', version: '0.9.0', status: 'planned' as const },
  ];

  for (const phase of stridePhases) {
    await prisma.stridePhase.upsert({
      where: { code: phase.code },
      update: {},
      create: phase,
    });
  }
  console.log(`✓ ${stridePhases.length} STRIDE phases seeded`);

  // ── Super admin user (development only) ───────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const adminEmail = 'admin@healthhubafrica.com';
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existing) {
      const passwordHash = await bcrypt.hash('Admin@123!', 12);
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          role: UserRole.super_admin,
          isVerified: true,
        },
      });
      console.log(`✓ Super admin created: ${adminEmail} / Admin@123!`);
    } else {
      console.log(`✓ Super admin already exists: ${adminEmail}`);
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
