import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Subscription plans ────────────────────────────────────────────────────
  const plans = [
    {
      slug: 'free',
      tier: 'Free' as const,
      name: 'MyHealth Vault+ FREE',
      priceKobo: 0,
      annualPriceKobo: 0,
      launchPriceKobo: 0,
      billingPeriod: 'monthly',
      features: [
        'Digital Health Passport',
        'Personal Health Record Storage',
        'Emergency Health Profile',
        'Medication Reminders',
        'Appointment Reminders',
        'Vaccination Tracking',
        'Access to Pay-Per-Use Services',
      ],
      familyPricing: [],
      noClaimPct: 0,
      isMostPopular: false,
      isBestValue: false,
      bestFor: '',
      displayOrder: 0,
    },
    {
      slug: 'basiccare',
      tier: 'BasicCare' as const,
      name: 'BasicCare™',
      priceKobo: 1_250_000,
      annualPriceKobo: 14_900_000,
      launchPriceKobo: 9_900_000,
      billingPeriod: 'monthly',
      features: [
        'Everything in FREE',
        '2 TeleCare™ Consultations Annually',
        'e-Prescriptions',
        'Care Navigation Support',
        'Discounted CareTest™ Services',
        'Preferred MinuteCare™ Pricing',
        'Preferred DispatchCare™ Pricing',
        '3% No Claim Discount',
      ],
      familyPricing: [],
      noClaimPct: 3,
      isMostPopular: false,
      isBestValue: false,
      bestFor: 'Individuals and young professionals',
      displayOrder: 1,
    },
    {
      slug: 'silvercare',
      tier: 'SilverCare' as const,
      name: 'SilverCare™',
      priceKobo: 2_490_000,
      annualPriceKobo: 29_900_000,
      launchPriceKobo: 24_900_000,
      billingPeriod: 'monthly',
      features: [
        'Everything in BasicCare™',
        '12 TeleCare™ Consultations Annually',
        '2 Specialist Second Opinions',
        'Annual Wellness Assessment',
        'Chronic Disease Monitoring',
        'Annual CareTest™ Screening Package',
        'Enhanced Care Navigation',
        '5% No Claim Discount',
      ],
      familyPricing: [
        { members: 2, annualPriceKobo: 54_900_000 },
        { members: 3, annualPriceKobo: 79_900_000 },
        { members: 4, annualPriceKobo: 99_900_000 },
        { members: 5, annualPriceKobo: 119_900_000 },
        { members: '6-10', annualPriceKobo: 149_900_000 },
      ],
      noClaimPct: 5,
      isMostPopular: true,
      isBestValue: false,
      bestFor: 'Individuals and families seeking comprehensive healthcare access',
      displayOrder: 2,
    },
    {
      slug: 'goldcare',
      tier: 'GoldCare' as const,
      name: 'GoldCare™',
      priceKobo: 4_990_000,
      annualPriceKobo: 59_900_000,
      launchPriceKobo: 49_900_000,
      billingPeriod: 'monthly',
      features: [
        'Everything in SilverCare™',
        'Expanded TeleCare™ Access',
        'Comprehensive Annual Screening',
        'Executive Health Review',
        'Dedicated Care Coordinator',
        'Priority DispatchCare™ Response',
        'TravelSafe™ Nigeria',
        '7% No Claim Discount',
      ],
      familyPricing: [
        { members: 2, annualPriceKobo: 109_900_000 },
        { members: 3, annualPriceKobo: 149_900_000 },
        { members: 4, annualPriceKobo: 189_900_000 },
        { members: 5, annualPriceKobo: 229_900_000 },
        { members: '6-10', annualPriceKobo: 299_900_000 },
      ],
      noClaimPct: 7,
      isMostPopular: false,
      isBestValue: true,
      bestFor: 'Executives and high-utilization members',
      displayOrder: 3,
    },
    {
      slug: 'conciergcare',
      tier: 'ConciergeCare' as const,
      name: 'ConciergeCare™',
      priceKobo: 12_500_000,
      annualPriceKobo: 150_000_000,
      launchPriceKobo: 99_900_000,
      billingPeriod: 'monthly',
      features: [
        'Dedicated Relationship Manager',
        'Concierge Care Coordination',
        'Priority Clinical Access',
        'Monthly Wellness Check-Ins',
        'Quarterly Health Reviews',
        'Executive Care Planning',
        'Priority DispatchCare™ Services',
        'TravelSafe™ Global',
        'Enhanced Family Coordination',
      ],
      familyPricing: [
        { members: 2, annualPriceKobo: 249_900_000 },
        { members: 3, annualPriceKobo: 349_900_000 },
        { members: 4, annualPriceKobo: 449_900_000 },
        { members: 5, annualPriceKobo: 549_900_000 },
        { members: '6-10', annualPriceKobo: 699_900_000 },
      ],
      noClaimPct: 0,
      isMostPopular: false,
      isBestValue: false,
      bestFor: 'Executives, affluent families, diaspora sponsors, VIP members',
      displayOrder: 4,
    },
  ];

  // TODO: remove `as any` casts once `npx prisma generate` is run after DB migration.
  // The Prisma client is stale — it predates the new fields (annualPriceKobo, launchPriceKobo,
  // familyPricing, noClaimPct, isMostPopular, isBestValue, bestFor) and the updated PlanTier
  // enum values (BasicCare, SilverCare, GoldCare, ConciergeCare).
  for (const plan of plans) {
    await (prisma.subscriptionPlan.upsert as any)({
      where: { slug: plan.slug },
      update: {
        priceKobo: plan.priceKobo,
        annualPriceKobo: plan.annualPriceKobo,
        launchPriceKobo: plan.launchPriceKobo,
        features: plan.features,
        familyPricing: plan.familyPricing,
        noClaimPct: plan.noClaimPct,
        isMostPopular: plan.isMostPopular,
        isBestValue: plan.isBestValue,
        bestFor: plan.bestFor,
      },
      create: plan,
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

  // ── Admin users (development only) ───────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const devAdmins = [
      { email: 'admin@healthhubafrica.com', password: 'Admin@123!', role: UserRole.super_admin },
      { email: 'healthubafrica@gmail.com', password: 'Admin@123!', role: UserRole.admin },
    ];

    for (const admin of devAdmins) {
      const existing = await prisma.user.findUnique({ where: { email: admin.email } });
      if (!existing) {
        const passwordHash = await bcrypt.hash(admin.password, 12);
        await prisma.user.create({
          data: { email: admin.email, passwordHash, role: admin.role, isVerified: true },
        });
        console.log(`✓ Admin created: ${admin.email} / ${admin.password}`);
      } else {
        // Ensure existing accounts are verified and have the correct role
        await prisma.user.update({
          where: { email: admin.email },
          data: { isVerified: true, isActive: true, role: admin.role },
        });
        console.log(`✓ Admin updated: ${admin.email}`);
      }
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
