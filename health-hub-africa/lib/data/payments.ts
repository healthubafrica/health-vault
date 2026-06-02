export type PaymentStatus = 'paid' | 'pending' | 'failed'

export interface Payment {
  id: string
  description: string
  amount: number
  date: string
  status: PaymentStatus
  gateway: 'Paystack' | 'Flutterwave'
}

export const PAYMENTS: Payment[] = [
  {
    id: 'PAY-001',
    description: 'Premium Subscription — Gold Plan',
    amount: 25000,
    date: '2026-05-01',
    status: 'paid',
    gateway: 'Paystack',
  },
  {
    id: 'PAY-002',
    description: 'CareTest™ Diagnostic Panel',
    amount: 40000,
    date: '2026-04-28',
    status: 'paid',
    gateway: 'Flutterwave',
  },
  {
    id: 'PAY-003',
    description: 'TeleCare™ Consultation Session',
    amount: 15000,
    date: '2026-04-10',
    status: 'paid',
    gateway: 'Paystack',
  },
  {
    id: 'PAY-004',
    description: 'DispatchCare™ Emergency Request',
    amount: 30000,
    date: '2026-03-22',
    status: 'paid',
    gateway: 'Flutterwave',
  },
]

export const SUBSCRIPTION_PLANS = [
  {
    id: 'standard',
    name: 'Standard',
    price: 5000,
    period: 'month',
    features: [
      'MinuteCare™ access',
      'Basic health records',
      'Emergency dispatch (pay-per-use)',
      'Standard support',
    ],
    highlighted: false,
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 25000,
    period: 'month',
    popular: true,
    features: [
      'Everything in Standard',
      'TeleCare™ (24/7 priority)',
      'HealthConsult™ care plan',
      'CareTest™ discounts (20%)',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    id: 'concierge',
    name: 'Concierge',
    price: 75000,
    period: 'month',
    features: [
      'Everything in Gold',
      'Expert Review™ included',
      'NeuroFlex™ access',
      'Dedicated care coordinator',
      'Home visit eligible',
      '24/7 concierge line',
    ],
    highlighted: false,
  },
]
