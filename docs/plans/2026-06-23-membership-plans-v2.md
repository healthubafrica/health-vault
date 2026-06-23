# MyHealth Vault+™ Membership Plans v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the entire subscription pricing model to Health-Hub Africa®'s five-tier premium structure (FREE → BasicCare™ → SilverCare™ → GoldCare™ → ConciergeCare™), rebuild the marketing site's homepage Plans section and full Pricing page, and harden the patient portal's upgrade flow.

**Architecture:** Three-layer update — (1) Prisma schema + seed data drives ground truth for all pricing, (2) the NestJS subscriptions service handles upgrade/family/annual logic, (3) marketing site reads from static constants (no API call needed there), while the patient portal dynamically fetches from the API.

**Tech Stack:** NestJS + Prisma (PostgreSQL) · Next.js 14 (App Router) · Framer Motion · Tailwind · TypeScript

---

## Reference: New Plan Pricing

| Plan | Monthly (kobo) | Annual (kobo) | Launch Annual (kobo) | No-Claim % |
|------|---------------|---------------|----------------------|------------|
| FREE | 0 | 0 | 0 | 0 |
| BasicCare™ | 1,250,000 | 14,900,000 | 9,900,000 | 3 |
| SilverCare™ | 2,490,000 | 29,900,000 | 24,900,000 | 5 |
| GoldCare™ | 4,990,000 | 59,900,000 | 49,900,000 | 7 |
| ConciergeCare™ | 12,500,000 | 150,000,000 | 99,900,000 | 0 |

> All prices in Nigerian Naira kobo (÷100 = Naira). ₦12,500/mo = 1,250,000 kobo.

### Family Annual Pricing (kobo)

| Members | SilverCare™ | GoldCare™ | ConciergeCare™ |
|---------|-------------|-----------|----------------|
| 2 | 54,900,000 | 109,900,000 | 249,900,000 |
| 3 | 79,900,000 | 149,900,000 | 349,900,000 |
| 4 | 99,900,000 | 189,900,000 | 449,900,000 |
| 5 | 119,900,000 | 229,900,000 | 549,900,000 |
| 6–10 | 149,900,000 | 299,900,000 | 699,900,000 |

---

## Phase 1 — Backend: Schema + Migration + Seed

### Task 1: Update PlanTier enum in Prisma schema

**Files:**
- Modify: `health-hub-africa-api/prisma/schema.prisma` (lines 105–111)

**Context:** The current enum has `Free | Basic | Mid_Level | Gold | Corporate`. We need five new tiers. Because existing seeds have no production data yet, we replace the enum entirely via migration.

**Step 1: Edit the enum block**

Replace the existing `PlanTier` enum (lines 105–111):

```prisma
enum PlanTier {
  Free
  BasicCare
  SilverCare
  GoldCare
  ConciergeCare
}
```

**Step 2: Add new fields to the SubscriptionPlan model**

In `SubscriptionPlan` (after line 775 `priceKobo`), add:

```prisma
  annualPriceKobo   Int       @default(0) @map("annual_price_kobo")
  launchPriceKobo   Int       @default(0) @map("launch_price_kobo")
  familyPricing     Json      @default("[]") @map("family_pricing")
  noClaimPct        Int       @default(0) @map("no_claim_pct")
  isMostPopular     Boolean   @default(false) @map("is_most_popular")
  isBestValue       Boolean   @default(false) @map("is_best_value")
  bestFor           String    @default("") @map("best_for")
```

**Step 3: Run Prisma migration**

```bash
cd health-hub-africa-api
npx prisma migrate dev --name update_plan_tiers_v2
```

Expected: Migration file created in `prisma/migrations/`. If it fails due to existing enum values, run `npx prisma migrate reset --skip-seed` first (dev env only).

**Step 4: Verify schema compiles**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid!`

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add v2 plan tiers and family/annual pricing fields"
```

---

### Task 2: Update seed data with new five-plan structure

**Files:**
- Modify: `health-hub-africa-api/prisma/seed.ts` (lines 9–25)

**Step 1: Replace the `plans` array in seed.ts**

Replace lines 10–16 with:

```typescript
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
      slug: 'conciergecare',
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
  ]
```

**Step 2: Update the upsert call** (currently line 18–24) to include the new fields:

```typescript
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
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
```

**Step 3: Run seed**

```bash
npx prisma db seed
```

Expected: `✓ 5 subscription plans seeded`

**Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(db): seed v2 membership plan pricing"
```

---

### Task 3: Update SubscribeDto to support annual billing and family size

**Files:**
- Modify: `health-hub-africa-api/src/subscriptions/dto/subscribe.dto.ts`

**Step 1: Add `familySize` field**

Replace entire file:

```typescript
import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '../../common/enums';

export class SubscribeDto {
  @ApiProperty({ description: 'Subscription plan ID' })
  @IsString()
  planId: string;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional({ description: 'Number of family members (2–10, annual only, Silver/Gold/Concierge)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  familySize?: number;

  @ApiPropertyOptional({ description: 'Patient ID (admin only; omit for own)' })
  @IsOptional()
  @IsString()
  patientId?: string;
}
```

**Step 2: Commit**

```bash
git add src/subscriptions/dto/subscribe.dto.ts
git commit -m "feat(subscriptions): add familySize to SubscribeDto"
```

---

### Task 4: Update SubscriptionsService — annual pricing, family pricing, upgrade flow

**Files:**
- Modify: `health-hub-africa-api/src/subscriptions/subscriptions.service.ts`

**Step 1: Update `subscribe()` method**

The method needs to:
1. Resolve the correct amount based on `billingCycle` (monthly = `priceKobo`, annual = `annualPriceKobo`)
2. If `familySize` >= 2 and `billingCycle === 'annually'`, look up the family pricing from the plan's `familyPricing` JSON
3. Cancel any existing active subscription for this patient before creating a new one (upgrade flow)

Replace lines 32–71 with:

```typescript
  async subscribe(dto: SubscribeDto, currentUser: JwtPayload) {
    let patientId = dto.patientId;

    if (!patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException('Patient profile not found');
      patientId = patient.id;
    } else {
      this.requireAdmin(currentUser);
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    // Cancel any existing active or trial subscription (upgrade path)
    const existing = await this.prisma.patientSubscription.findFirst({
      where: { patientId, status: { in: ['active', 'trial'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      await this.prisma.patientSubscription.update({
        where: { id: existing.id },
        data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'Upgraded to new plan' },
      });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);

    if (dto.billingCycle === 'annually') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (dto.billingCycle === 'quarterly') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    return this.prisma.patientSubscription.create({
      data: {
        patientId,
        planId: dto.planId,
        startedAt: startDate,
        expiresAt: endDate,
      },
      include: { plan: true },
    });
  }
```

**Step 2: Update `findPlans()` to order by `displayOrder`**

```typescript
  async findPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }
```

**Step 3: Commit**

```bash
git add src/subscriptions/subscriptions.service.ts
git commit -m "feat(subscriptions): handle upgrade flow + annual/family pricing"
```

---

## Phase 2 — Marketing Site: Homepage Plans Section

### Task 5: Update Plans.tsx with new 5-plan structure + founding member banner

**Files:**
- Modify: `myvaultplus-web/src/components/Plans.tsx`

**Context:** The homepage `Plans` section should show all 5 plan cards in a simplified layout with a billing cycle toggle (monthly/annual) and a "Founding Member" banner. Clicking any paid plan's CTA goes to `/plans`. This is a `'use client'` component that uses Framer Motion.

**Step 1: Replace the entire `plans` data array (lines 7–79)**

```typescript
type BillingMode = 'monthly' | 'annual'

interface FamilyTier {
  members: number | string
  annualPriceKobo: number
}

interface PlanDef {
  slug: string
  iconBg: string
  iconColor: string
  iconPath: string
  badge: string
  displayBadge?: string
  desc: string
  monthlyKobo: number
  annualKobo: number
  launchAnnualKobo: number
  highlight: boolean
  ctaHref: string
  ctaLabel: string
  items: string[]
  hasFamilyOption: boolean
}

const PLANS: PlanDef[] = [
  {
    slug: 'free',
    iconBg: '#6DC43F',
    iconColor: '#07251C',
    iconPath: 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
    badge: 'FREE',
    desc: 'Your Health Passport at no cost. Core portal access with pay-per-use services.',
    monthlyKobo: 0,
    annualKobo: 0,
    launchAnnualKobo: 0,
    highlight: false,
    ctaHref: 'https://portal.myvaultplus.com/register',
    ctaLabel: 'Create Free Account',
    items: [
      'Digital Health Passport',
      'Personal Health Record Storage',
      'Emergency Health Profile',
      'Medication & Appointment Reminders',
      'Access to Pay-Per-Use Services',
    ],
    hasFamilyOption: false,
  },
  {
    slug: 'basiccare',
    iconBg: '#07251C',
    iconColor: '#6DC43F',
    iconPath: 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
    badge: 'BASICCARE™',
    desc: 'For individuals and young professionals. TeleCare, e-Prescriptions, and care navigation.',
    monthlyKobo: 1_250_000,
    annualKobo: 14_900_000,
    launchAnnualKobo: 9_900_000,
    highlight: false,
    ctaHref: '/plans',
    ctaLabel: 'Choose BasicCare™',
    items: [
      'Everything in FREE',
      '2 TeleCare™ Consultations Annually',
      'e-Prescriptions',
      'Care Navigation Support',
      'Discounted CareTest™ Services',
      '3% No Claim Discount',
    ],
    hasFamilyOption: false,
  },
  {
    slug: 'silvercare',
    iconBg: '#07251C',
    iconColor: '#6DC43F',
    iconPath: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z',
    badge: 'SILVERCARE™',
    displayBadge: 'MOST POPULAR',
    desc: 'Comprehensive for individuals and families. 12 TeleCare sessions, wellness assessments, and more.',
    monthlyKobo: 2_490_000,
    annualKobo: 29_900_000,
    launchAnnualKobo: 24_900_000,
    highlight: true,
    ctaHref: '/plans',
    ctaLabel: 'Choose SilverCare™',
    items: [
      'Everything in BasicCare™',
      '12 TeleCare™ Consultations Annually',
      '2 Specialist Second Opinions',
      'Annual Wellness Assessment',
      'Chronic Disease Monitoring',
      '5% No Claim Discount',
    ],
    hasFamilyOption: true,
  },
  {
    slug: 'goldcare',
    iconBg: '#6DC43F',
    iconColor: '#07251C',
    iconPath: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    badge: 'GOLDCARE™',
    displayBadge: 'BEST VALUE',
    desc: 'Executive-grade. Dedicated care coordinator, comprehensive screening, and TravelSafe™ Nigeria.',
    monthlyKobo: 4_990_000,
    annualKobo: 59_900_000,
    launchAnnualKobo: 49_900_000,
    highlight: false,
    ctaHref: '/plans',
    ctaLabel: 'Choose GoldCare™',
    items: [
      'Everything in SilverCare™',
      'Dedicated Care Coordinator',
      'Executive Health Review',
      'Priority DispatchCare™ Response',
      'TravelSafe™ Nigeria',
      '7% No Claim Discount',
    ],
    hasFamilyOption: true,
  },
  {
    slug: 'conciergecare',
    iconBg: '#07251C',
    iconColor: '#6DC43F',
    iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    badge: 'CONCIERGCARE™',
    desc: 'White-glove health management. Dedicated Relationship Manager, TravelSafe™ Global.',
    monthlyKobo: 12_500_000,
    annualKobo: 150_000_000,
    launchAnnualKobo: 99_900_000,
    highlight: false,
    ctaHref: '/plans',
    ctaLabel: 'Choose ConciergeCare™',
    items: [
      'Dedicated Relationship Manager',
      'Concierge Care Coordination',
      'Priority Clinical Access',
      'Quarterly Health Reviews',
      'TravelSafe™ Global',
      'Enhanced Family Coordination',
    ],
    hasFamilyOption: true,
  },
]

function formatKobo(kobo: number): string {
  if (kobo === 0) return 'Free'
  return '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })
}
```

**Step 2: Add billing toggle state and update the component function signature**

Inside `export default function Plans()`, add before the `return`:

```typescript
  const [billing, setBilling] = useState<BillingMode>('monthly')
```

Add `useState` to the imports at the top:

```typescript
import { useState, useRef } from 'react'
```

**Step 3: Add the Founding Member banner + billing toggle above the plan cards grid**

Inside the `motion.div` header block (after the CTA button, before the plan cards grid), add:

```tsx
{/* Founding Member Banner */}
<motion.div
  variants={bodyVariant}
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    background: 'linear-gradient(90deg, #07251C 0%, #0A4E3C 100%)',
    border: '1.5px solid #6DC43F',
    borderRadius: 100,
    padding: '8px 18px 8px 12px',
    marginTop: 24,
    marginBottom: 8,
  }}
>
  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6DC43F', display: 'inline-block', flexShrink: 0 }} />
  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
    Founding Member Pricing — Available to the First 1,000 Members
  </span>
</motion.div>

{/* Billing Toggle */}
<motion.div
  variants={bodyVariant}
  style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#F0F4F0', borderRadius: 100, padding: 4, marginTop: 16, marginBottom: 4 }}
>
  {(['monthly', 'annual'] as BillingMode[]).map((mode) => (
    <button
      key={mode}
      onClick={() => setBilling(mode)}
      style={{
        padding: '8px 22px',
        borderRadius: 100,
        border: 'none',
        background: billing === mode ? '#07251C' : 'transparent',
        color: billing === mode ? '#fff' : '#27433A',
        fontFamily: 'var(--font-manrope), sans-serif',
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'background 0.18s, color 0.18s',
      }}
    >
      {mode === 'monthly' ? 'Monthly' : 'Annual (Save up to 20%)'}
    </button>
  ))}
</motion.div>
```

**Step 4: Update the plan card to show correct price and founding member discount**

Replace the price block inside the plan card:

```tsx
{/* Price */}
<div style={{ marginBottom: 26 }}>
  {billing === 'annual' && plan.launchAnnualKobo > 0 && plan.monthlyKobo > 0 ? (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-0.03em', color: '#07251C' }}>
          {formatKobo(plan.launchAnnualKobo)}
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, color: plan.highlight ? '#0A4E3C' : '#7A8C84' }}>/year</span>
      </div>
      <div style={{ fontSize: 12, color: '#888', textDecoration: 'line-through', marginTop: 2 }}>
        {formatKobo(plan.annualKobo)}/year regular
      </div>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 38, letterSpacing: '-0.03em', color: '#07251C' }}>
        {formatKobo(plan.monthlyKobo)}
      </span>
      {plan.monthlyKobo > 0 && (
        <span style={{ fontSize: 15, fontWeight: 500, color: plan.highlight ? '#0A4E3C' : '#7A8C84' }}>/month</span>
      )}
    </div>
  )}
</div>
```

**Step 5: Add the `displayBadge` chip to plan cards that have it**

After the badge label block, add:

```tsx
{plan.displayBadge && (
  <div style={{ display: 'inline-flex', alignItems: 'center', background: '#6DC43F', color: '#07251C', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', padding: '3px 10px', borderRadius: 100, marginBottom: 8 }}>
    {plan.displayBadge}
  </div>
)}
```

**Step 6: Update CTA button text and href**

Replace the CTA `motion.a` content:

```tsx
<motion.a
  href={plan.ctaHref}
  ...
>
  {plan.ctaLabel}
</motion.a>
```

**Step 7: Run dev server and verify**

```bash
cd myvaultplus-web
npm run dev
```

Open `http://localhost:3000` and verify:
- 5 plan cards appear
- Billing toggle switches monthly/annual prices
- Founding member banner shows
- SilverCare has "MOST POPULAR" chip
- GoldCare has "BEST VALUE" chip

**Step 8: Commit**

```bash
git add src/components/Plans.tsx
git commit -m "feat(marketing): update homepage Plans section to v2 pricing"
```

---

## Phase 3 — Marketing Site: Full Pricing Page Rewrite

### Task 6: Create shared plan data constants file

**Files:**
- Create: `myvaultplus-web/src/lib/planData.ts`

**Context:** The Pricing page is a Server Component (no `'use client'`). We need the plan data available as static TypeScript constants — no API call. This avoids waterfall and keeps pricing SEO-indexable.

**Step 1: Create the file**

```typescript
// Static pricing constants — single source of truth for the marketing site.
// The backend seed.ts must stay in sync with these values.

export interface FamilyTier {
  members: number | string
  annualPriceKobo: number
}

export interface PlanData {
  slug: string
  name: string
  tagline: string
  bestFor: string
  monthlyKobo: number
  annualKobo: number
  launchAnnualKobo: number
  noClaimPct: number
  isMostPopular: boolean
  isBestValue: boolean
  ctaHref: string
  ctaLabel: string
  features: string[]
  familyPricing: FamilyTier[]
}

export const PLANS: PlanData[] = [
  {
    slug: 'free',
    name: 'MyHealth Vault+ FREE',
    tagline: '₦0/month · ₦0/year',
    bestFor: '',
    monthlyKobo: 0,
    annualKobo: 0,
    launchAnnualKobo: 0,
    noClaimPct: 0,
    isMostPopular: false,
    isBestValue: false,
    ctaHref: 'https://portal.myvaultplus.com/register',
    ctaLabel: 'Create Free Account',
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
  },
  {
    slug: 'basiccare',
    name: 'BasicCare™',
    tagline: '₦12,500/month · ₦149,000/year',
    bestFor: 'Individuals and young professionals',
    monthlyKobo: 1_250_000,
    annualKobo: 14_900_000,
    launchAnnualKobo: 9_900_000,
    noClaimPct: 3,
    isMostPopular: false,
    isBestValue: false,
    ctaHref: 'https://portal.myvaultplus.com/register',
    ctaLabel: 'Choose BasicCare™',
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
  },
  {
    slug: 'silvercare',
    name: 'SilverCare™',
    tagline: '₦24,900/month · ₦299,000/year',
    bestFor: 'Individuals and families seeking comprehensive healthcare access',
    monthlyKobo: 2_490_000,
    annualKobo: 29_900_000,
    launchAnnualKobo: 24_900_000,
    noClaimPct: 5,
    isMostPopular: true,
    isBestValue: false,
    ctaHref: 'https://portal.myvaultplus.com/register',
    ctaLabel: 'Choose SilverCare™',
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
  },
  {
    slug: 'goldcare',
    name: 'GoldCare™',
    tagline: '₦49,900/month · ₦599,000/year',
    bestFor: 'Executives and high-utilization members',
    monthlyKobo: 4_990_000,
    annualKobo: 59_900_000,
    launchAnnualKobo: 49_900_000,
    noClaimPct: 7,
    isMostPopular: false,
    isBestValue: true,
    ctaHref: 'https://portal.myvaultplus.com/register',
    ctaLabel: 'Choose GoldCare™',
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
  },
  {
    slug: 'conciergecare',
    name: 'ConciergeCare™',
    tagline: '₦125,000/month · ₦1,500,000/year',
    bestFor: 'Executives, affluent families, diaspora sponsors, VIP members',
    monthlyKobo: 12_500_000,
    annualKobo: 150_000_000,
    launchAnnualKobo: 99_900_000,
    noClaimPct: 0,
    isMostPopular: false,
    isBestValue: false,
    ctaHref: 'https://portal.myvaultplus.com/register',
    ctaLabel: 'Choose ConciergeCare™',
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
  },
]

export const PAY_PER_USE = [
  { service: 'TeleCare™ GP Consultation', priceKobo: 1_000_000 },
  { service: 'TeleCare™ Specialist Consultation', priceKobo: 2_000_000 },
  { service: 'MinuteCare™ Consultation', priceKobo: 1_500_000 },
  { service: 'MinuteCare™ Urgent Care Visit', priceKobo: 3_500_000 },
  { service: 'DispatchCare™ Emergency Response', priceKobo: 7_500_000 },
  { service: 'Home Visit', priceKobo: 7_500_000 },
  { service: 'Executive Home Visit', priceKobo: 15_000_000 },
  { service: 'Basic Wellness Screening', priceKobo: 2_500_000 },
  { service: 'Comprehensive Screening', priceKobo: 7_500_000 },
  { service: 'Specialist Second Opinion', priceKobo: 5_000_000 },
  { service: 'International Second Opinion', priceKobo: 15_000_000 },
  { service: 'Travel Consultation', priceKobo: 2_000_000 },
  { service: 'NeuroFlex® Assessment', priceKobo: 15_000_000 },
]

export const CORPORATE_TIERS = [
  { label: 'SME (10–50 Employees)', priceKobo: 15_000_000 },
  { label: 'Mid-Market (51–250 Employees)', priceKobo: 12_500_000 },
  { label: 'Enterprise (250+ Employees)', priceKobo: 9_900_000 },
]

export const COMPARE_ROWS = [
  { service: 'TeleCare™ GP Sessions', free: 'Pay-per-use', basiccare: '2/year', silvercare: '12/year', goldcare: 'Expanded', conciergecare: 'Unlimited' },
  { service: 'Specialist Second Opinion', free: '—', basiccare: '—', silvercare: '2/year', goldcare: '✓', conciergecare: '✓' },
  { service: 'Annual Wellness Assessment', free: '—', basiccare: '—', silvercare: '✓', goldcare: 'Comprehensive', conciergecare: 'Quarterly' },
  { service: 'DispatchCare™', free: 'Pay-per-use', basiccare: 'Preferred rate', silvercare: 'Preferred rate', goldcare: 'Priority', conciergecare: 'Priority' },
  { service: 'MinuteCare™', free: 'Pay-per-use', basiccare: 'Preferred rate', silvercare: 'Preferred rate', goldcare: '✓', conciergecare: '✓' },
  { service: 'CareTest™ Screening', free: 'Pay-per-use', basiccare: 'Discounted', silvercare: 'Annual package', goldcare: 'Comprehensive', conciergecare: '✓' },
  { service: 'Care Navigation', free: '—', basiccare: '✓', silvercare: 'Enhanced', goldcare: 'Dedicated coordinator', conciergecare: 'Relationship Manager' },
  { service: 'TravelSafe™', free: '—', basiccare: '—', silvercare: '—', goldcare: 'Nigeria', conciergecare: 'Global' },
  { service: 'No Claim Discount', free: '—', basiccare: '3%', silvercare: '5%', goldcare: '7%', conciergecare: '—' },
  { service: 'Family Plan Option', free: '—', basiccare: '—', silvercare: '✓', goldcare: '✓', conciergecare: '✓' },
]

export function formatKobo(kobo: number): string {
  if (kobo === 0) return 'Free'
  return '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })
}
```

**Step 2: Commit**

```bash
git add src/lib/planData.ts
git commit -m "feat(marketing): add static plan data constants for pricing page"
```

---

### Task 7: Create PlanCards client component (billing toggle + family select)

**Files:**
- Create: `myvaultplus-web/src/components/PlanCards.tsx`

**Context:** The pricing page is a Server Component so the interactive billing toggle and family dropdown must be extracted into a `'use client'` component.

**Step 1: Create the file**

```typescript
'use client'
import { useState } from 'react'
import AnimatedSection from './AnimatedSection'
import AnimatedCard from './AnimatedCard'
import { PLANS, formatKobo, type PlanData, type FamilyTier } from '@/lib/planData'

type BillingMode = 'monthly' | 'annual'

function resolveFamilyPrice(plan: PlanData, familySize: number): number {
  if (!plan.familyPricing.length || familySize <= 1) return 0
  const tier = plan.familyPricing.find((t: FamilyTier) => {
    if (typeof t.members === 'number') return t.members === familySize
    if (familySize >= 6 && t.members === '6-10') return true
    return false
  })
  return tier?.annualPriceKobo ?? 0
}

export default function PlanCards() {
  const [billing, setBilling] = useState<BillingMode>('monthly')
  const [familySizes, setFamilySizes] = useState<Record<string, number>>({})

  function setFamilySize(slug: string, size: number) {
    setFamilySizes((prev) => ({ ...prev, [slug]: size }))
  }

  return (
    <div>
      {/* Billing toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
        <div style={{ display: 'inline-flex', background: '#F0F4F0', borderRadius: 100, padding: 4 }}>
          {(['monthly', 'annual'] as BillingMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setBilling(mode)}
              style={{
                padding: '10px 28px',
                borderRadius: 100,
                border: 'none',
                background: billing === mode ? '#07251C' : 'transparent',
                color: billing === mode ? '#fff' : '#27433A',
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 0.18s, color 0.18s',
              }}
            >
              {mode === 'monthly' ? 'Monthly' : 'Annual — Save up to 20%'}
            </button>
          ))}
        </div>
      </div>

      {/* Plan grid — 5 cards */}
      <AnimatedSection stagger className="rg-3" style={{ alignItems: 'stretch', flexWrap: 'wrap' }}>
        {PLANS.map((plan) => {
          const familySize = familySizes[plan.slug] ?? 1
          const familyPrice = billing === 'annual' ? resolveFamilyPrice(plan, familySize) : 0
          const showFamilyPrice = familyPrice > 0

          let displayPrice: string
          let displaySub: string
          let strikethrough: string | null = null

          if (billing === 'annual' && plan.annualKobo > 0) {
            if (showFamilyPrice) {
              displayPrice = formatKobo(familyPrice)
              displaySub = '/year (family)'
            } else if (plan.launchAnnualKobo > 0) {
              displayPrice = formatKobo(plan.launchAnnualKobo)
              displaySub = '/year'
              strikethrough = formatKobo(plan.annualKobo)
            } else {
              displayPrice = formatKobo(plan.annualKobo)
              displaySub = '/year'
            }
          } else {
            displayPrice = formatKobo(plan.monthlyKobo)
            displaySub = plan.monthlyKobo > 0 ? '/month' : ''
          }

          return (
            <AnimatedCard
              key={plan.slug}
              style={{
                background: plan.isMostPopular ? '#07251C' : '#fff',
                border: plan.isMostPopular ? 'none' : '1.5px solid #D4D4D4',
                borderRadius: 20,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 240,
              }}
            >
              {/* Badges */}
              {plan.isMostPopular && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#6DC43F', color: '#07251C', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', padding: '5px 16px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </div>
              )}
              {plan.isBestValue && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#07251C', color: '#6DC43F', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', padding: '5px 16px', borderRadius: 100, whiteSpace: 'nowrap', border: '1.5px solid #6DC43F' }}>
                  BEST VALUE
                </div>
              )}

              {/* Plan name */}
              <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: plan.isMostPopular ? '#6DC43F' : '#07251C', marginBottom: 6, marginTop: plan.isMostPopular || plan.isBestValue ? 14 : 0 }}>
                {plan.name}
              </div>

              {plan.bestFor && (
                <p style={{ fontSize: 12, lineHeight: 1.5, color: plan.isMostPopular ? 'rgba(255,255,255,0.65)' : '#5A7068', margin: '0 0 16px' }}>
                  {plan.bestFor}
                </p>
              )}

              {/* Price */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-0.03em', color: plan.isMostPopular ? '#fff' : '#07251C' }}>
                    {displayPrice}
                  </span>
                  {displaySub && (
                    <span style={{ fontSize: 13, fontWeight: 500, color: plan.isMostPopular ? 'rgba(255,255,255,0.6)' : '#7A8C84' }}>
                      {displaySub}
                    </span>
                  )}
                </div>
                {strikethrough && (
                  <div style={{ fontSize: 12, color: plan.isMostPopular ? 'rgba(255,255,255,0.45)' : '#aaa', textDecoration: 'line-through', marginTop: 2 }}>
                    {strikethrough}/year regular
                  </div>
                )}
              </div>

              {/* Family size selector (annual only, plans with family pricing) */}
              {billing === 'annual' && plan.familyPricing.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: plan.isMostPopular ? 'rgba(255,255,255,0.7)' : '#5A7068', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Family Members
                  </label>
                  <select
                    value={familySize}
                    onChange={(e) => setFamilySize(plan.slug, Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${plan.isMostPopular ? 'rgba(255,255,255,0.25)' : '#D4D4D4'}`, background: plan.isMostPopular ? 'rgba(255,255,255,0.1)' : '#fff', color: plan.isMostPopular ? '#fff' : '#07251C', fontSize: 13, fontFamily: 'var(--font-manrope), sans-serif' }}
                  >
                    <option value={1}>Just me (individual)</option>
                    <option value={2}>2 Members</option>
                    <option value={3}>3 Members</option>
                    <option value={4}>4 Members</option>
                    <option value={5}>5 Members</option>
                    <option value={6}>6–10 Members</option>
                  </select>
                </div>
              )}

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 24 }}>
                {plan.features.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: plan.isMostPopular ? 'rgba(109,196,63,0.25)' : '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 7" stroke="#6DC43F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <span style={{ color: plan.isMostPopular ? 'rgba(255,255,255,0.85)' : '#27433A' }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <a
                href={plan.ctaHref}
                style={{ display: 'block', textAlign: 'center', background: plan.isMostPopular ? '#6DC43F' : '#07251C', color: plan.isMostPopular ? '#07251C' : '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: 14, borderRadius: 100 }}
              >
                {plan.ctaLabel}
              </a>
            </AnimatedCard>
          )
        })}
      </AnimatedSection>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/PlanCards.tsx
git commit -m "feat(marketing): add interactive PlanCards component with billing toggle and family picker"
```

---

### Task 8: Create SavingsCalculator client component

**Files:**
- Create: `myvaultplus-web/src/components/SavingsCalculator.tsx`

**Context:** An interactive tool where users pick a plan and see Retail Value vs. Membership Cost vs. Annual Savings.

**Step 1: Create the file**

```typescript
'use client'
import { useState } from 'react'
import { PLANS, formatKobo } from '@/lib/planData'

const RETAIL_ESTIMATES: Record<string, number> = {
  basiccare: 35_000_000,
  silvercare: 75_000_000,
  goldcare: 120_000_000,
  conciergecare: 250_000_000,
}

export default function SavingsCalculator() {
  const [selectedSlug, setSelectedSlug] = useState('silvercare')
  const plan = PLANS.find((p) => p.slug === selectedSlug) ?? PLANS[2]
  const retail = RETAIL_ESTIMATES[selectedSlug] ?? 0
  const membership = plan.launchAnnualKobo || plan.annualKobo
  const savings = retail - membership
  const pct = retail > 0 ? Math.round((savings / retail) * 100) : 0

  return (
    <div style={{ background: '#07251C', borderRadius: 24, padding: '48px 40px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 12 }}>— Savings Calculator</div>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 30px)', color: '#fff', margin: 0 }}>
          How much could you save?
        </h3>
      </div>

      {/* Plan selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
        {PLANS.filter((p) => p.slug !== 'free').map((p) => (
          <button
            key={p.slug}
            onClick={() => setSelectedSlug(p.slug)}
            style={{
              padding: '10px 20px',
              borderRadius: 100,
              border: `1.5px solid ${selectedSlug === p.slug ? '#6DC43F' : 'rgba(255,255,255,0.2)'}`,
              background: selectedSlug === p.slug ? '#6DC43F' : 'transparent',
              color: selectedSlug === p.slug ? '#07251C' : 'rgba(255,255,255,0.8)',
              fontFamily: 'var(--font-manrope), sans-serif',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.18s',
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        {[
          { label: 'Retail Value of Services', value: formatKobo(retail), sub: 'if purchased individually' },
          { label: 'Membership Cost', value: formatKobo(membership), sub: 'founding member annual price', highlight: false },
          { label: 'Annual Savings', value: formatKobo(savings), sub: `you save ${pct}%`, highlight: true },
        ].map((item) => (
          <div key={item.label} style={{ background: item.highlight ? '#6DC43F' : 'rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: item.highlight ? '#07251C' : 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
              {item.label}
            </div>
            <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: item.highlight ? '#07251C' : '#fff' }}>
              {item.value}
            </div>
            <div style={{ fontSize: 12, color: item.highlight ? 'rgba(7,37,28,0.7)' : 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/SavingsCalculator.tsx
git commit -m "feat(marketing): add SavingsCalculator component"
```

---

### Task 9: Create PlanWizard client component (plan recommendation)

**Files:**
- Create: `myvaultplus-web/src/components/PlanWizard.tsx`

**Step 1: Create the file**

```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'

type Answers = {
  profile: '' | 'individual' | 'family' | 'executive' | 'family-executive'
  location: '' | 'nigeria' | 'international'
}

const RECOMMENDATIONS: Record<string, { plan: string; slug: string; reason: string }> = {
  'individual-nigeria': { plan: 'BasicCare™', slug: 'basiccare', reason: 'Great for individuals in Nigeria needing TeleCare access and care navigation.' },
  'individual-international': { plan: 'SilverCare™', slug: 'silvercare', reason: 'Individual coverage with stronger care coordination for those who travel.' },
  'family-nigeria': { plan: 'SilverCare™ Family', slug: 'silvercare', reason: 'The most popular choice for Nigerian families — comprehensive and great value.' },
  'family-international': { plan: 'ConciergeCare™ Family', slug: 'conciergecare', reason: 'International family coverage with TravelSafe™ Global and concierge coordination.' },
  'executive-nigeria': { plan: 'GoldCare™', slug: 'goldcare', reason: 'Executive-grade with dedicated care coordinator, priority dispatch, and TravelSafe™ Nigeria.' },
  'executive-international': { plan: 'GoldCare™', slug: 'goldcare', reason: 'Best value for executives, with the option to add international coverage.' },
  'family-executive-nigeria': { plan: 'GoldCare™ Family', slug: 'goldcare', reason: 'Executive-level care for the whole family with priority DispatchCare™ and TravelSafe™.' },
  'family-executive-international': { plan: 'ConciergeCare™ Family', slug: 'conciergecare', reason: 'White-glove family coverage with global travel protection and concierge management.' },
}

export default function PlanWizard() {
  const [answers, setAnswers] = useState<Answers>({ profile: '', location: '' })
  const [showResult, setShowResult] = useState(false)

  const key = answers.profile && answers.location ? `${answers.profile}-${answers.location}` : null
  const result = key ? RECOMMENDATIONS[key] : null

  function reset() {
    setAnswers({ profile: '', location: '' })
    setShowResult(false)
  }

  const profiles = [
    { value: 'individual', label: 'Individual' },
    { value: 'family', label: 'Family' },
    { value: 'executive', label: 'Executive (Individual)' },
    { value: 'family-executive', label: 'Executive Family' },
  ] as const

  const locations = [
    { value: 'nigeria', label: 'Within Nigeria' },
    { value: 'international', label: 'International / Diaspora' },
  ] as const

  return (
    <div style={{ background: '#F7FAF7', borderRadius: 24, padding: '48px 40px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 12 }}>— Plan Finder</div>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 30px)', color: '#07251C', margin: '0 0 10px' }}>
          Not sure which plan is right for you?
        </h3>
        <p style={{ color: '#5A7068', fontSize: 14, margin: 0 }}>Answer two quick questions and we'll match you to the best plan.</p>
      </div>

      {!showResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Q1 */}
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#07251C', marginBottom: 12 }}>1. Who are you covering?</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {profiles.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setAnswers((a) => ({ ...a, profile: p.value }))}
                  style={{ padding: '10px 20px', borderRadius: 100, border: `1.5px solid ${answers.profile === p.value ? '#07251C' : '#D4D4D4'}`, background: answers.profile === p.value ? '#07251C' : '#fff', color: answers.profile === p.value ? '#fff' : '#27433A', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Q2 */}
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#07251C', marginBottom: 12 }}>2. Where are you primarily based?</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {locations.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setAnswers((a) => ({ ...a, location: l.value }))}
                  style={{ padding: '10px 20px', borderRadius: 100, border: `1.5px solid ${answers.location === l.value ? '#07251C' : '#D4D4D4'}`, background: answers.location === l.value ? '#07251C' : '#fff', color: answers.location === l.value ? '#fff' : '#27433A', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!answers.profile || !answers.location}
            onClick={() => setShowResult(true)}
            style={{ padding: '14px 32px', borderRadius: 100, border: 'none', background: answers.profile && answers.location ? '#07251C' : '#D4D4D4', color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: answers.profile && answers.location ? 'pointer' : 'not-allowed', alignSelf: 'flex-start' }}
          >
            Find My Plan →
          </button>
        </div>
      ) : result ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: '#07251C', borderRadius: 20, padding: '32px 36px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#6DC43F', textTransform: 'uppercase', marginBottom: 10 }}>We recommend</div>
            <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 32, color: '#fff', marginBottom: 12 }}>{result.plan}</div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 24px' }}>{result.reason}</p>
            <a href={`https://portal.myvaultplus.com/register`} style={{ display: 'inline-block', background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 28px', borderRadius: 100 }}>
              Get Started
            </a>
          </div>
          <button onClick={reset} style={{ background: 'none', border: 'none', color: '#137333', fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}>
            Start over
          </button>
        </div>
      ) : null}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/PlanWizard.tsx
git commit -m "feat(marketing): add PlanWizard recommendation component"
```

---

### Task 10: Rewrite plans/page.tsx

**Files:**
- Modify: `myvaultplus-web/src/app/plans/page.tsx` (full rewrite)

**Context:** Replace the old 3-plan page (Starter/Growth/Enterprise) with the new full-featured pricing page. This is a Server Component that composes client components for interactive sections.

**Step 1: Rewrite the file**

```tsx
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'
import AnimatedSection from '@/components/AnimatedSection'
import PlanCards from '@/components/PlanCards'
import SavingsCalculator from '@/components/SavingsCalculator'
import PlanWizard from '@/components/PlanWizard'
import Image from 'next/image'
import Link from 'next/link'
import { COMPARE_ROWS, PAY_PER_USE, CORPORATE_TIERS, formatKobo } from '@/lib/planData'

export const metadata = {
  title: 'Membership Plans — MyHealth Vault+™',
  description: 'Choose from FREE, BasicCare™, SilverCare™, GoldCare™, or ConciergeCare™. Founding member pricing available for the first 1,000 members.',
}

export default function PlansPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      {/* Hero */}
      <div className="page-card-first">
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&h=1080&fit=crop&q=85" alt="Healthcare plans" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.82) 0%, rgba(7,37,28,0.70) 50%, rgba(4,18,12,0.88) 100%)', pointerEvents: 'none' }} />
          <div className="hero-content">
            {/* Founding member badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(109,196,63,0.15)', border: '1px solid rgba(109,196,63,0.5)', borderRadius: 100, padding: '6px 16px', marginBottom: 24 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6DC43F', display: 'inline-block' }} />
              <span style={{ color: '#6DC43F', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>Founding Member Pricing — First 1,000 Members</span>
            </div>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(30px, 5vw, 56px)', color: '#fff', letterSpacing: '-0.03em' }}>Premium Healthcare Access.</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(30px, 5vw, 56px)', color: '#6DC43F', letterSpacing: '-0.02em' }}>Built for Every Stage of Life.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              Five plans — from a free Health Passport to concierge care management. Choose the coverage that fits your life.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href="/corporate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.5)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>
                Corporate Plans
              </a>
              <a href="https://portal.myvaultplus.com/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Get Started Free
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>
          <HeroMarquee marginTop={60} />
        </section>
      </div>

      {/* Section 1 — Plan cards (interactive, client component) */}
      <div className="page-card" style={{ background: '#fff' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— Pricing</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 40px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 600 }}>
              Five plans. <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>One platform.</em>
            </h2>
            <p style={{ color: '#5A7068', fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              Start free and upgrade when you're ready. Annual plans include founding member pricing for the first 1,000 members.
            </p>
          </div>
          <PlanCards />
          <div style={{ marginTop: 20, background: '#F7FAF7', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: '#27433A', fontSize: 15, maxWidth: 600 }}>Corporate and HMO plans available for employers, estates, schools, and government organisations.</p>
            <Link href="/corporate" style={{ color: '#137333', fontWeight: 600, fontSize: 14.5, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              Enquire About Corporate Plans →
            </Link>
          </div>
        </section>
      </div>

      {/* Section 2 — Plan recommendation wizard */}
      <div className="page-card" style={{ background: '#EBEBEB' }}>
        <section className="section-inner">
          <PlanWizard />
        </section>
      </div>

      {/* Section 3 — Savings calculator */}
      <div className="page-card" style={{ background: '#07251C' }}>
        <section className="section-inner">
          <SavingsCalculator />
        </section>
      </div>

      {/* Section 4 — Comparison table */}
      <div className="page-card" style={{ background: '#fff' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— Compare</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 40px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: '0 auto', maxWidth: 560 }}>
              Everything <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>included.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16, overflowX: 'auto' }}>
            <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', minWidth: 700 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#07251C' }}>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 13, color: '#6DC43F', fontWeight: 600 }}>Service</th>
                    {['FREE', 'BasicCare™', 'SilverCare™', 'GoldCare™', 'ConciergeCare™'].map((h) => (
                      <th key={h} style={{ padding: '16px 14px', textAlign: 'center', fontSize: 12, color: '#fff', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, idx) => (
                    <tr key={row.service} style={{ background: idx % 2 === 0 ? '#fff' : '#F7FAF7', borderBottom: '1px solid rgba(7,37,28,0.06)' }}>
                      <td style={{ padding: '13px 20px', fontWeight: 600, fontSize: 13.5, color: '#07251C' }}>{row.service}</td>
                      {[row.free, row.basiccare, row.silvercare, row.goldcare, row.conciergecare].map((val, vi) => (
                        <td key={vi} style={{ padding: '13px 14px', textAlign: 'center', fontSize: 13, color: val === '✓' ? '#137333' : val === '—' ? '#C4CEC9' : '#27433A', fontWeight: val === '✓' ? 700 : 500 }}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Section 5 — Pay-per-use pricing */}
      <div className="page-card" style={{ background: '#EBEBEB' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— Pay-Per-Use</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 40px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 520 }}>
              Flexible access, <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>no commitment.</em>
            </h2>
            <p style={{ color: '#5A7068', fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              Every service is available individually. Members on paid plans get preferred pricing.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {PAY_PER_USE.map((item) => (
              <div key={item.service} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ fontSize: 14, color: '#27433A', fontWeight: 500 }}>{item.service}</span>
                <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 16, color: '#07251C', whiteSpace: 'nowrap' }}>{formatKobo(item.priceKobo)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Section 6 — Corporate teaser */}
      <div className="page-card" style={{ background: '#07251C' }}>
        <section className="section-inner" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 16 }}>— Corporate (Coming Soon)</div>
          <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 40px)', color: '#fff', margin: '0 auto 20px', maxWidth: 560, lineHeight: 1.08 }}>
            Group plans for <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', color: '#6DC43F' }}>employers.</em>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, maxWidth: 460, margin: '0 auto 36px', lineHeight: 1.65 }}>
            Volume pricing for SMEs, mid-market, and enterprise organisations across Nigeria.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 36 }}>
            {CORPORATE_TIERS.map((tier) => (
              <div key={tier.label} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '20px 28px', textAlign: 'center', minWidth: 180 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 8 }}>{tier.label}</div>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 22, color: '#6DC43F' }}>{formatKobo(tier.priceKobo)}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>per member/year</div>
              </div>
            ))}
          </div>
          <Link href="/corporate" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 13px 13px 28px', borderRadius: 100 }}>
            Enquire About Corporate
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </Link>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
```

**Step 2: Build verify**

```bash
cd myvaultplus-web
npm run build
```

Expected: Build completes without type errors.

**Step 3: Commit**

```bash
git add src/app/plans/page.tsx
git commit -m "feat(marketing): full pricing page rewrite with v2 plans, wizard, calculator, and comparison"
```

---

## Phase 4 — Patient Portal: Subscription Upgrade Flow

### Task 11: Update SubscriptionsScreen for new plan tiers and upgrade UX

**Files:**
- Modify: `health-hub-africa/components/screens/SubscriptionsScreen.tsx`

**Context:** The screen already fetches plans dynamically from the API. After the seed update, plan names and features will auto-update. We need to: (1) fix the `highlighted` tier logic (was checking for 'gold', now should check `isMostPopular`), (2) add an annual/monthly billing toggle, (3) add upgrade confirmation dialog, (4) pass `billingCycle` to the subscribe call.

**Step 1: Update the `handleSubscribe` function**

The current call is `await subscriptions.subscribe(plan.id, plan.billingPeriod)`. Update to pass `billingCycle` state:

```typescript
  const [billing, setBilling] = useState<'monthly' | 'annually'>('monthly')

  async function handleSubscribe(plan: SubscriptionPlan) {
    const planLabel = `${plan.name} (${billing})`
    const confirmed = window.confirm(
      activeSub
        ? `Upgrade to ${planLabel}? Your current plan will be cancelled immediately.`
        : `Subscribe to ${planLabel}?`
    )
    if (!confirmed) return

    try {
      setSaving(true)
      await subscriptions.subscribe(plan.id, billing)
      toast.success(activeSub ? `Upgraded to ${plan.name}!` : `Subscribed to ${plan.name}!`)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Subscription failed')
    } finally {
      setSaving(false)
    }
  }
```

**Step 2: Update the `highlighted` logic**

```typescript
const highlighted = plan.isMostPopular === true
```

Note: The `SubscriptionPlan` type from `@/lib/api` needs `isMostPopular` added. Check `lib/api.ts` for the `SubscriptionPlan` type and add the field.

**Step 3: Add billing toggle UI** above the plan cards grid:

```tsx
{/* Billing toggle */}
<div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', alignSelf: 'flex-start' }}>
  {(['monthly', 'annually'] as const).map((mode) => (
    <button
      key={mode}
      onClick={() => setBilling(mode)}
      className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all"
      style={{
        background: billing === mode ? 'var(--color-text)' : 'transparent',
        color: billing === mode ? 'var(--color-bg)' : 'var(--color-text-muted)',
        border: 'none',
        cursor: 'pointer',
        letterSpacing: '0.07em',
      }}
    >
      {mode === 'monthly' ? 'Monthly' : 'Annual'}
    </button>
  ))}
</div>
```

**Step 4: Update the price display in the card**

```tsx
<div className="flex items-end gap-1 mt-2 mb-4">
  <span className="text-2xl font-bold" style={{ color: highlighted ? '#6DC43F' : 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
    {billing === 'annually' && plan.annualPriceKobo
      ? formatCurrency(plan.annualPriceKobo / 100)
      : formatCurrency(plan.priceKobo / 100)}
  </span>
  <span className="text-xs pb-0.5" style={{ color: highlighted ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}>
    /{billing === 'annually' ? 'year' : plan.billingPeriod}
  </span>
</div>
```

**Step 5: Add `annualPriceKobo` and `isMostPopular` to the SubscriptionPlan type in `lib/api.ts`**

Find the `SubscriptionPlan` interface in `lib/api.ts` and add:

```typescript
  annualPriceKobo?: number
  isMostPopular?: boolean
  isBestValue?: boolean
  bestFor?: string
  noClaimPct?: number
```

**Step 6: Also update the subscribe API call in lib/api.ts**

Find the `subscriptions.subscribe` method and ensure it passes `billingCycle` as a string:

```typescript
subscribe: (planId: string, billingCycle: 'monthly' | 'annually') =>
  request<{ data: PatientSubscription }>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ planId, billingCycle }),
  }),
```

**Step 7: Commit**

```bash
git add components/screens/SubscriptionsScreen.tsx lib/api.ts
git commit -m "feat(portal): update subscription screen for v2 plans — annual toggle, upgrade confirmation"
```

---

## Checklist — Success Criteria

- [ ] `PlanTier` enum updated: `Free | BasicCare | SilverCare | GoldCare | ConciergeCare`
- [ ] DB migration applied cleanly
- [ ] Seed runs successfully — 5 plans seeded with correct kobo values
- [ ] `subscribe()` service cancels existing sub before creating new one (upgrade path)
- [ ] Annual billing period sets `expiresAt + 1 year`
- [ ] `findPlans()` orders by `displayOrder`
- [ ] Homepage Plans section shows 5 cards with billing toggle + founding member banner
- [ ] Plans page hero loads with founding member badge
- [ ] Plan cards show monthly/annual prices with family dropdown for Silver/Gold/Concierge
- [ ] Launch (founding member) price shows with regular price struck through on annual toggle
- [ ] SilverCare card has "MOST POPULAR" chip; GoldCare has "BEST VALUE" chip
- [ ] Plan recommendation wizard returns correct plan for all 8 profile+location combinations
- [ ] Savings calculator shows correct retail/membership/savings for each plan
- [ ] Comparison table has all 5 tiers as columns
- [ ] Pay-per-use pricing table shows all 13 services
- [ ] Corporate teaser shows 3 tier pricing
- [ ] Patient portal billing toggle switches monthly ↔ annual
- [ ] Upgrade confirmation dialog appears when changing plan
- [ ] `npm run build` passes with zero type errors on both `myvaultplus-web` and `health-hub-africa`

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-06-23-membership-plans-v2.md`.**

Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Parallel Session (separate)** — Open a new session with `/executing-plans`, batch execution with checkpoints.

Which approach?
