// Static TravelSafe™ pricing constants — independent of the main MyHealth
// Vault+™ plans in planData.ts. TravelSafe remains bundled as a feature
// inside ConciergeCare™ etc (see planData.ts PLANS); this is TravelSafe's
// own standalone pricing, shown on /services/travelsafe.

const REGISTER_URL = 'https://portal.myvaultplus.com/register'

export type TravelSafeTierSlug = 'essential' | 'plus' | 'premium' | 'executive'

export interface TravelSafeTier {
  slug: TravelSafeTierSlug
  name: string
  priceKobo: number
  bestFor: string[]
  features: string[]
  isMostPopular: boolean
  ctaLabel: string
  ctaHref: string
}

export interface TravelSafeFamilyTier {
  slug: string
  name: string
  priceKobo: number
}

export interface TravelSafeAddon {
  service: string
  priceLabel: string
}

export interface TravelSafeCompareRow {
  feature: string
  essential: string
  plus: string
  premium: string
  executive: string
}

export const TRAVELSAFE_TIERS: TravelSafeTier[] = [
  {
    slug: 'essential',
    name: 'TravelSafe™ Essential',
    priceKobo: 2_490_000,
    bestFor: ['Students', 'Vacation Travelers', 'First-time Travelers'],
    features: [
      'Travel Insurance',
      'Visa Certificate',
      'Digital Health Passport',
      'MyHealth Vault+™',
      'Emergency QR Card',
      'Medical Records',
      'Medication List',
      'Allergies',
      'Vaccination Records',
      'Emergency Contacts',
    ],
    isMostPopular: false,
    ctaLabel: 'Choose Essential',
    ctaHref: REGISTER_URL,
  },
  {
    slug: 'plus',
    name: 'TravelSafe™ Plus',
    priceKobo: 3_990_000,
    bestFor: [],
    features: [
      'Everything in Essential plus',
      'One TeleCare Consultation Before Travel',
      'One TeleCare Consultation While Abroad',
      'Family Notifications',
      'Medication Review',
      'Priority Support',
      'Secure Record Sharing',
    ],
    isMostPopular: false,
    ctaLabel: 'Choose Plus',
    ctaHref: REGISTER_URL,
  },
  {
    slug: 'premium',
    name: 'TravelSafe™ Premium',
    priceKobo: 5_990_000,
    bestFor: [],
    features: [
      'Everything in Plus plus',
      'Three TeleCare Consultations',
      'Concierge Medical Assistance',
      'Hospital Coordination',
      'Medical Navigation',
      'Second Medical Opinion',
      'Priority Physician Access',
    ],
    isMostPopular: true,
    ctaLabel: 'Choose Premium',
    ctaHref: REGISTER_URL,
  },
  {
    slug: 'executive',
    name: 'TravelSafe™ Executive',
    priceKobo: 14_990_000,
    bestFor: [],
    features: [
      'Everything in Premium plus',
      'Unlimited TeleCare',
      'Executive Concierge',
      'Dedicated Care Manager',
      'Hospital Admission Coordination',
      'VIP Medical Support',
      'Executive Wellness Monitoring',
    ],
    isMostPopular: false,
    ctaLabel: 'Choose Executive',
    ctaHref: REGISTER_URL,
  },
]

export const TRAVELSAFE_FAMILY: TravelSafeFamilyTier[] = [
  { slug: 'family-essential', name: 'Family Essential', priceKobo: 8_990_000 },
  { slug: 'family-plus', name: 'Family Plus', priceKobo: 13_990_000 },
  { slug: 'family-premium', name: 'Family Premium', priceKobo: 19_990_000 },
  { slug: 'family-executive', name: 'Family Executive', priceKobo: 39_990_000 },
]

export const TRAVELSAFE_ADDITIONAL_MEMBER_KOBO = 2_000_000

export const TRAVELSAFE_ADDONS: TravelSafeAddon[] = [
  { service: 'Pre-Travel Medical Assessment', priceLabel: '₦15,000' },
  { service: 'Travel Medical Certificate', priceLabel: '₦10,000' },
  { service: 'Health Screening', priceLabel: 'From ₦50,000' },
  { service: 'Vaccinations', priceLabel: 'Variable' },
  { service: 'Medication Review', priceLabel: '₦7,500' },
  { service: 'Medical Record Digitization', priceLabel: 'From ₦10,000' },
  { service: 'Medical Translation', priceLabel: 'From ₦25,000' },
  { service: 'Additional TeleCare', priceLabel: '₦10,000' },
]

export const TRAVELSAFE_COMPARE_ROWS: TravelSafeCompareRow[] = [
  { feature: 'Travel Insurance', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Visa Certificate', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Digital Health Passport', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Emergency QR Code', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'MyHealth Vault+™', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Medical Records', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Medication History', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Allergies', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Vaccination Records', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Emergency Contacts', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'TeleCare', essential: '—', plus: '2', premium: '3', executive: 'Unlimited' },
  { feature: 'Medical Concierge', essential: '—', plus: '—', premium: '✓', executive: '✓' },
  { feature: 'Hospital Coordination', essential: '—', plus: '—', premium: '✓', executive: '✓' },
  { feature: 'Family Record Sharing', essential: '—', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Priority Support', essential: '—', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Dedicated Care Manager', essential: '—', plus: '—', premium: '—', executive: '✓' },
  { feature: 'Unlimited TeleCare', essential: '—', plus: '—', premium: '—', executive: '✓' },
]
