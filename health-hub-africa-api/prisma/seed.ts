import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SCHEDULING_POLICY_ID, DEFAULT_SCHEDULING_POLICY } from '../src/scheduling-policy/scheduling-policy.constants';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Subscription plans ────────────────────────────────────────────────────
  const GB = (n: number) => BigInt(n) * BigInt(1024 * 1024 * 1024);
  const MB = (n: number) => BigInt(n) * BigInt(1024 * 1024);

  const plans = [
    {
      slug: 'free',
      tier: 'Free' as const,
      name: 'MyHealth Vault+ FREE',
      priceKobo: 0,
      annualPriceKobo: 0,
      launchPriceKobo: 0,
      billingPeriod: 'monthly',
      storageQuotaBytes: MB(500),
      maxFiles: 100,
      maxFileSizeBytes: MB(10),
      // Approved Free feature set — must stay in lockstep with the marketing
      // site's Plans & Pricing page (myvaultplus-web/src/lib/planData.ts).
      features: [
        'Digital Health Passport',
        'Basic Personal Health Record (PHR) Storage',
        'Emergency Health Profile',
        'Appointment Reminders',
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
      storageQuotaBytes: GB(2),
      maxFiles: 500,
      maxFileSizeBytes: MB(25),
      features: [
        'TeleCare™ Physician Consultations: 2 consultations/year',
        'MinuteCare™ Walk-in/Urgent Care: 1 visit/year',
        'HealthConsult™ Specialist Second Opinions: 1 consultation/year',
        'DispatchCare™ Emergency Response: 15% discount on all responses',
        'CareTest™ Diagnostic Discount: 10%',
        'Annual Preventive Wellness Screening: 1 Basic Wellness Screening',
        'Routine Laboratory Panel: None',
        'Nurse Advice Line: Unlimited',
        'Remote Patient Monitoring: Optional Add-on',
        'Wearable Device Integration: Basic',
        'Family Members: Individual',
        'Everything in FREE',
        'e-Prescriptions',
        'Care Navigation Support',
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
      storageQuotaBytes: GB(10),
      maxFiles: 2000,
      maxFileSizeBytes: MB(100),
      features: [
        'TeleCare™ Physician Consultations: 6 consultations/year',
        'MinuteCare™ Walk-in/Urgent Care: 3 visits/year',
        'HealthConsult™ Specialist Second Opinions: 2 consultations/year',
        'DispatchCare™ Emergency Response: 25% discount + 1 priority dispatch/year',
        'CareTest™ Diagnostic Discount: 20%',
        'Annual Preventive Wellness Screening: 1 Comprehensive Wellness Screening',
        'Routine Laboratory Panel: 1 panel/year',
        'Nurse Advice Line: Unlimited',
        'Remote Patient Monitoring: Optional Add-on',
        'Wearable Device Integration: Standard',
        'Family Members: Up to 5',
        'Everything in BasicCare™',
        'Chronic Disease Monitoring',
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
      storageQuotaBytes: GB(50),
      maxFiles: 10000,
      maxFileSizeBytes: MB(500),
      features: [
        'TeleCare™ Physician Consultations: 24 consultations/year',
        'MinuteCare™ Walk-in/Urgent Care: 6 visits/year',
        'HealthConsult™ Specialist Second Opinions: 4 consultations/year',
        'DispatchCare™ Emergency Response: 1 complimentary dispatch/year + 25% discount thereafter',
        'CareTest™ Diagnostic Discount: 30%',
        'Annual Preventive Wellness Screening: 1 Executive Wellness Screening',
        'Routine Laboratory Panel: 1 Executive panel/year',
        'Nurse Advice Line: Unlimited',
        'Remote Patient Monitoring: Included',
        'Wearable Device Integration: Advanced',
        'Family Members: Up to 8',
        'Everything in SilverCare™',
        'Dedicated Care Coordinator',
        'Executive Health Review',
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
      slug: 'conciergecare',
      tier: 'ConciergeCare' as const,
      name: 'ConciergeCare™',
      priceKobo: 12_500_000,
      annualPriceKobo: 150_000_000,
      launchPriceKobo: 99_900_000,
      billingPeriod: 'monthly',
      storageQuotaBytes: null, // Unlimited
      maxFiles: null, // Unlimited
      maxFileSizeBytes: GB(2),
      features: [
        'TeleCare™ Physician Consultations: Unlimited (Fair Use Policy)',
        'MinuteCare™ Walk-in/Urgent Care: Unlimited (Fair Use Policy)',
        'HealthConsult™ Specialist Second Opinions: Unlimited',
        'DispatchCare™ Emergency Response: Unlimited priority dispatch coordination',
        'CareTest™ Diagnostic Discount: 40%',
        'Annual Preventive Wellness Screening: 1 Executive Plus Screening',
        'Routine Laboratory Panel: 1 Comprehensive Executive panel/year',
        'Nurse Advice Line: Unlimited',
        'Remote Patient Monitoring: Included',
        'Wearable Device Integration: Premium',
        'Family Members: Up to 10',
        'Dedicated Relationship Manager',
        'Concierge Care Coordination',
        'Priority Clinical Access',
        'Monthly Wellness Check-Ins',
        'Quarterly Health Reviews',
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
        storageQuotaBytes: plan.storageQuotaBytes,
        maxFileSizeBytes: plan.maxFileSizeBytes,
        maxFiles: plan.maxFiles,
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

  // ── Scheduling policy ─────────────────────────────────────────────────────
  await prisma.schedulingPolicy.upsert({
    where: { id: SCHEDULING_POLICY_ID },
    update: {},
    create: { id: SCHEDULING_POLICY_ID, ...DEFAULT_SCHEDULING_POLICY },
  });
  console.log('✓ Scheduling policy seeded');

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
