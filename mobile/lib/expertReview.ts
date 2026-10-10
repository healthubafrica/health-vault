// Expert Review (specialist second opinion) types and pure helpers.
// Status keys mirror the backend ExpertReviewStatus enum.

export type ExpertReviewStatus =
  | 'submitted'
  | 'under_review'
  | 'specialist_assigned'
  | 'in_consultation'
  | 'report_ready'
  | 'closed'
  | 'cancelled';

export const REVIEW_TYPES = [
  'second_opinion',
  'multi_specialist',
  'surgical_review',
  'imaging_review',
  'pathology_review',
] as const;
export type ReviewType = (typeof REVIEW_TYPES)[number];

export const URGENCIES = ['routine', 'urgent', 'emergency'] as const;
export type Urgency = (typeof URGENCIES)[number];

export interface StatusEvent {
  id?: string;
  fromStatus?: string | null;
  toStatus: string;
  notes?: string | null;
  occurredAt: string;
}

export interface FinalReport {
  summary?: string | null;
  clinicalOpinion?: string | null;
  recommendations?: string | null;
  followUpRequired?: boolean | null;
  pdfUrl?: string | null;
  createdAt?: string;
}

export interface SpecialistNote {
  id?: string;
  note?: string | null;
  notes?: string | null;
  content?: string | null;
  createdAt?: string;
}

export interface CaseDocument {
  id?: string;
  title?: string | null;
  name?: string | null;
  fileName?: string | null;
}

export interface ExpertReviewCase {
  id: string;
  hhaRef: string;
  reviewType: string;
  urgency: string;
  status: string;
  clinicalQuestion: string;
  primaryDiagnosis?: string | null;
  submittedAt: string;
  completedAt?: string | null;
  statusEvents?: StatusEvent[];
  finalReport?: FinalReport | null;
  documents?: CaseDocument[];
  specialistNotes?: SpecialistNote[];
  reportRequiresDisclaimer?: boolean;
}

export interface CreateExpertReviewInput {
  reviewType: ReviewType;
  urgency: Urgency;
  clinicalSummary: string;
  specificQuestions?: string;
  requestedSpecialization?: string;
}

export type PillKind = 'amber' | 'green' | 'red' | 'new';

const STATUS_PILL: Record<string, PillKind> = {
  submitted: 'amber',
  under_review: 'green',
  specialist_assigned: 'green',
  in_consultation: 'green',
  report_ready: 'green',
  closed: 'new',
  cancelled: 'red',
};

const URGENCY_PILL: Record<string, PillKind> = {
  routine: 'new',
  urgent: 'amber',
  emergency: 'red',
};

export const MIN_SUMMARY_LENGTH = 20;

export const URGENCY_NOTE =
  'Urgency affects how quickly your request is reviewed, not emergency dispatch. In an emergency call 112 or use DispatchCare.';

export const DISCLAIMER_TEXT =
  'This report is a second opinion based only on the information and documents you provided. It does not replace an in-person examination and is not an emergency service. Discuss any change to your treatment with your treating clinician.';

/** "under_review" -> "Under Review". */
export function titleCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const statusLabel = titleCase;
export const urgencyLabel = titleCase;
export const reviewTypeLabel = titleCase;

export function statusPill(status: string): PillKind {
  return STATUS_PILL[status] ?? 'new';
}

export function urgencyPill(urgency: string): PillKind {
  return URGENCY_PILL[urgency] ?? 'new';
}

export function caseTitle(c: Pick<ExpertReviewCase, 'primaryDiagnosis' | 'clinicalQuestion'>): string {
  return c.primaryDiagnosis || c.clinicalQuestion;
}

/** Oldest first, without mutating the input. */
export function sortEvents(events: StatusEvent[] | undefined): StatusEvent[] {
  return [...(events ?? [])].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
}

export function noteText(n: SpecialistNote): string {
  return n.note ?? n.notes ?? n.content ?? '';
}

export function documentName(d: CaseDocument): string {
  return d.title ?? d.name ?? d.fileName ?? 'Document';
}

export interface FormValues {
  reviewType: ReviewType | null;
  urgency: Urgency | null;
  clinicalSummary: string;
  specificQuestions: string;
  requestedSpecialization: string;
}

/** Returns field -> message; empty when valid. */
export function validateForm(v: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!v.reviewType) errors.reviewType = 'Choose a review type.';
  if (!v.urgency) errors.urgency = 'Choose an urgency.';
  if (v.clinicalSummary.trim().length < MIN_SUMMARY_LENGTH) {
    errors.clinicalSummary = `Describe your case in at least ${MIN_SUMMARY_LENGTH} characters.`;
  }
  return errors;
}

/** Exact request body: only whitelisted fields, optional ones omitted when blank. */
export function buildPayload(v: FormValues): CreateExpertReviewInput {
  const questions = v.specificQuestions.trim();
  const spec = v.requestedSpecialization.trim();
  return {
    reviewType: v.reviewType as ReviewType,
    urgency: v.urgency as Urgency,
    clinicalSummary: v.clinicalSummary.trim(),
    ...(questions ? { specificQuestions: questions } : {}),
    ...(spec ? { requestedSpecialization: spec } : {}),
  };
}
