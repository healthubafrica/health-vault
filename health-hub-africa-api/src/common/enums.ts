// Local string enum-like constants for values that are not (yet) defined in schema.prisma.
// Uses `const as const` instead of TypeScript `enum` to avoid SWC's lazy _export() getter
// pattern which causes @IsEnum() to receive `undefined` at decorator evaluation time
// when there is a circular module dependency in the NestJS import graph.

export const ProviderType = {
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  PHARMACIST: 'PHARMACIST',
  LAB_TECHNICIAN: 'LAB_TECHNICIAN',
  PHYSIOTHERAPIST: 'PHYSIOTHERAPIST',
  THERAPIST: 'THERAPIST',
  SPECIALIST: 'SPECIALIST',
  RADIOLOGIST: 'RADIOLOGIST',
  OTHER: 'OTHER',
} as const;
export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType];

export const AppointmentType = {
  in_person: 'in_person',
  virtual: 'virtual',
  home_visit: 'home_visit',
} as const;
export type AppointmentType = (typeof AppointmentType)[keyof typeof AppointmentType];

export const LabOrderStatus = {
  pending: 'pending',
  collected: 'collected',
  processing: 'processing',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;
export type LabOrderStatus = (typeof LabOrderStatus)[keyof typeof LabOrderStatus];

export const BillingCycle = {
  monthly: 'monthly',
  quarterly: 'quarterly',
  annually: 'annually',
} as const;
export type BillingCycle = (typeof BillingCycle)[keyof typeof BillingCycle];

export const TelecareSessionStatus = {
  scheduled: 'scheduled',
  waiting: 'waiting',
  active: 'active',
  completed: 'completed',
  missed: 'missed',
  cancelled: 'cancelled',
} as const;
export type TelecareSessionStatus = (typeof TelecareSessionStatus)[keyof typeof TelecareSessionStatus];

export const SupportTicketStatus = {
  open: 'open',
  in_progress: 'in_progress',
  pending_response: 'pending_response',
  resolved: 'resolved',
  closed: 'closed',
} as const;
export type SupportTicketStatus = (typeof SupportTicketStatus)[keyof typeof SupportTicketStatus];
