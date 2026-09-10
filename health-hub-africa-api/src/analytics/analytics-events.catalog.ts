// Analytics event catalog (spec §21).
//
// This is the machine-readable half of docs/ANALYTICS-PRIVACY-GOVERNANCE.md
// §4. Its job is deliberately narrow:
//
//   1. Supply a default `event_version` when a client doesn't send one.
//   2. Make instrumentation drift *visible* — trackEvent() logs when a
//      well-formed but uncatalogued event name shows up, so new events get
//      added here (and to the governance doc) on purpose rather than by
//      accident.
//
// It is NOT an allow-list. The existing pipeline intentionally lets new
// event names flow straight through to the dashboards ("Adding a new event:
// no backend change required"), and fighting that would be a regression.
// Malformed *shapes* are still rejected in trackEvent(); see EVENT_NAME_RE.

export interface CatalogEntry {
  /** Current payload version. Bump when `properties` meaning changes (spec §21). */
  version: number;
  /** Where the authoritative emit happens. 'server' events must never be trusted from a browser. */
  origin: 'web' | 'mobile' | 'server';
}

// Well-formed event name: lowercase snake_case, describes a completed
// observation, not a UI label (spec §21).
export const EVENT_NAME_RE = /^[a-z][a-z0-9_]{2,63}$/;

export const ANALYTICS_EVENTS: Record<string, CatalogEntry> = {
  // ── Registration & OTP ──────────────────────────────────────────────────
  landing_view: { version: 1, origin: 'web' },
  registration_start: { version: 1, origin: 'web' },
  registration_step_view: { version: 1, origin: 'web' },
  registration_step_complete: { version: 1, origin: 'web' },
  registration_complete: { version: 1, origin: 'server' },
  registration_error: { version: 1, origin: 'web' },
  otp_requested: { version: 1, origin: 'web' },
  otp_delivery_success: { version: 1, origin: 'server' },
  otp_delivery_failure: { version: 1, origin: 'server' },
  otp_verify_success: { version: 1, origin: 'server' },
  otp_verify_failure: { version: 1, origin: 'server' },
  terms_viewed: { version: 1, origin: 'web' },
  terms_accepted: { version: 1, origin: 'web' },
  privacy_notice_viewed: { version: 1, origin: 'web' },
  profile_completed: { version: 1, origin: 'web' },
  login_success: { version: 1, origin: 'server' },
  first_meaningful_action: { version: 1, origin: 'server' },

  // ── Booking / appointments ──────────────────────────────────────────────
  service_selected: { version: 1, origin: 'web' },
  booking_started: { version: 1, origin: 'web' },
  booking_validation_error: { version: 1, origin: 'web' },
  booking_confirmed: { version: 1, origin: 'server' },
  booking_error: { version: 1, origin: 'web' },
  booking_cancelled: { version: 1, origin: 'web' },
  booking_rescheduled: { version: 1, origin: 'web' },

  // ── Payments & subscriptions ────────────────────────────────────────────
  checkout_started: { version: 1, origin: 'web' },
  checkout_start: { version: 1, origin: 'web' },
  payment_pending: { version: 1, origin: 'web' },
  payment_success: { version: 1, origin: 'server' },
  payment_failure: { version: 1, origin: 'server' },
  plan_select: { version: 1, origin: 'web' },
  subscription_checkout_error: { version: 1, origin: 'web' },
  subscription_cancelled: { version: 1, origin: 'web' },

  // ── Features ────────────────────────────────────────────────────────────
  upload_start: { version: 1, origin: 'web' },
  upload_success: { version: 1, origin: 'web' },
  upload_failure: { version: 1, origin: 'web' },
  share_start: { version: 1, origin: 'web' },
  share_success: { version: 1, origin: 'web' },
  share_failure: { version: 1, origin: 'web' },
  dispatch_request_started: { version: 1, origin: 'web' },
  dispatch_request_success: { version: 1, origin: 'web' },
  dispatch_request_failure: { version: 1, origin: 'web' },
  telecare_session_join_success: { version: 1, origin: 'web' },
  telecare_session_join_failure: { version: 1, origin: 'web' },
  travelsafe_trip_created: { version: 1, origin: 'web' },
  manual_entry_success: { version: 1, origin: 'web' },
  ticket_created: { version: 1, origin: 'web' },
  download: { version: 1, origin: 'web' },

  // ── Cross-cutting ───────────────────────────────────────────────────────
  page_view: { version: 1, origin: 'web' },
  ui_click: { version: 1, origin: 'web' },
  client_error: { version: 1, origin: 'web' },
};

export function catalogEntry(eventName: string): CatalogEntry | undefined {
  return ANALYTICS_EVENTS[eventName];
}
