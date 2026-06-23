// Static pricing constants — single source of truth for the marketing site.
// The backend seed.ts must stay in sync with these values.

export interface FamilyTier {
  members: number | string
  annualPriceKobo: number
}

export interface Plan {
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

export const PLANS: Plan[] = [
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
    slug: 'conciergcare',
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
  { service: 'TeleCare™ GP Sessions', free: 'Pay-per-use', basiccare: '2/year', silvercare: '12/year', goldcare: 'Expanded', conciergcare: 'Unlimited' },
  { service: 'Specialist Second Opinion', free: '—', basiccare: '—', silvercare: '2/year', goldcare: '✓', conciergcare: '✓' },
  { service: 'Annual Wellness Assessment', free: '—', basiccare: '—', silvercare: '✓', goldcare: 'Comprehensive', conciergcare: 'Quarterly' },
  { service: 'DispatchCare™', free: 'Pay-per-use', basiccare: 'Preferred rate', silvercare: 'Preferred rate', goldcare: 'Priority', conciergcare: 'Priority' },
  { service: 'MinuteCare™', free: 'Pay-per-use', basiccare: 'Preferred rate', silvercare: 'Preferred rate', goldcare: '✓', conciergcare: '✓' },
  { service: 'CareTest™ Screening', free: 'Pay-per-use', basiccare: 'Discounted', silvercare: 'Annual package', goldcare: 'Comprehensive', conciergcare: '✓' },
  { service: 'Care Navigation', free: '—', basiccare: '✓', silvercare: 'Enhanced', goldcare: 'Dedicated coordinator', conciergcare: 'Relationship Manager' },
  { service: 'TravelSafe™', free: '—', basiccare: '—', silvercare: '—', goldcare: 'Nigeria', conciergcare: 'Global' },
  { service: 'No Claim Discount', free: '—', basiccare: '3%', silvercare: '5%', goldcare: '7%', conciergcare: '—' },
  { service: 'Family Plan Option', free: '—', basiccare: '—', silvercare: '✓', goldcare: '✓', conciergcare: '✓' },
]

export function formatKobo(kobo: number): string {
  if (kobo === 0) return 'Free'
  return '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })
}

export interface SavingsService {
  key: string
  label: string
  priceKobo: number
  min: number
  max: number
}

// Retail pricing per the Customer Savings Calculator spec.
// TODO(future): swap this static array for an API-backed retail-services
// endpoint once the database is reachable — shape is designed for a 1:1 swap.
export const SAVINGS_SERVICES: SavingsService[] = [
  { key: 'teleGp', label: 'TeleCare™ GP Consultations', priceKobo: 1_000_000, min: 0, max: 50 },
  { key: 'teleSpecialist', label: 'TeleCare™ Specialist Consultations', priceKobo: 2_000_000, min: 0, max: 20 },
  { key: 'minuteCare', label: 'MinuteCare™ Visits', priceKobo: 1_500_000, min: 0, max: 20 },
  { key: 'dispatchCare', label: 'DispatchCare™ Emergency Responses', priceKobo: 7_500_000, min: 0, max: 10 },
  { key: 'homeVisit', label: 'Home Visits', priceKobo: 7_500_000, min: 0, max: 20 },
  { key: 'basicScreening', label: 'Basic Wellness Screenings', priceKobo: 2_500_000, min: 0, max: 10 },
  { key: 'comprehensiveScreening', label: 'Comprehensive Wellness Screenings', priceKobo: 7_500_000, min: 0, max: 10 },
  { key: 'specialistOpinion', label: 'Specialist Second Opinions', priceKobo: 5_000_000, min: 0, max: 10 },
  { key: 'intlOpinion', label: 'International Second Opinions', priceKobo: 15_000_000, min: 0, max: 10 },
  { key: 'neuroflex', label: 'NeuroFlex® Assessments', priceKobo: 15_000_000, min: 0, max: 10 },
]

// Pre-populated usage examples per plan, keyed by SavingsService.key.
// Any service not listed for a plan defaults to 0.
export const SAVINGS_DEFAULTS: Record<string, Record<string, number>> = {
  basiccare: { teleGp: 2 },
  silvercare: { teleGp: 6, teleSpecialist: 2, basicScreening: 1 },
  goldcare: { teleGp: 12, teleSpecialist: 4, comprehensiveScreening: 2, homeVisit: 1 },
  conciergcare: { teleGp: 12, teleSpecialist: 6, homeVisit: 2, comprehensiveScreening: 2, dispatchCare: 1 },
}

// Savings above this amount trigger the "big savings" smart message.
export const SAVINGS_BIG_THRESHOLD_KOBO = 50_000_000 // ₦500,000
