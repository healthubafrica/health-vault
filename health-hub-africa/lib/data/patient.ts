export const PATIENT = {
  id: 'HHA-CAN-2605-0004',
  name: 'Benjamin Okafor',
  firstName: 'Benjamin',
  email: 'b.okafor@email.com',
  phone: '+234 801 234 5678',
  dob: '1985-06-04',
  gender: 'Male',
  bloodGroup: 'O+',
  address: 'Victoria Island, Lagos',
  plan: 'Gold' as const,
  planExpiry: '2026-06-01',
  status: 'Stable' as const,
  avatar: 'BO',
  doctor: {
    name: 'Dr. Kelechi Asobie',
    initials: 'KA',
    specialty: 'General Practitioner',
    rating: 4.9,
    patients: 100,
    experience: 4,
  },
  vitals: {
    heartRate: 90,
    sleep: 6,
    bloodCells: 4000,
    weight: 65,
    weightTarget: { min: 45, max: 85 },
  },
  medical: {
    allergies: 'None',
    conditions: ['Hypertension (monitoring)'],
    medications: ['Amlodipine 5mg (active)'],
    carePlan: 'HealthConsult™',
  },
  emergency: {
    name: 'Mrs. Adaeze Okafor',
    relation: 'Spouse',
    phone: '+234 802 345 6789',
  },
  nextAppointment: {
    date: '2026-05-18',
    service: 'MinuteCare™',
  },
  alerts: [
    {
      id: 'a1',
      type: 'warning' as const,
      message: 'Medication refill due in 7 days',
      sub: 'Amlodipine 5mg',
    },
    {
      id: 'a2',
      type: 'info' as const,
      message: 'Lab report available for review',
      sub: 'Lipid Panel — May 2026',
      link: 'labs',
    },
  ],
}

export type Patient = typeof PATIENT
