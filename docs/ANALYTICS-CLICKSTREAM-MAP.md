# Clickstream Instrumentation Map

Spec §32 deliverable: "Clickstream Instrumentation Map listing every tracked page/CTA/element." Companion to `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` §4 (the event *name* catalog — what fires and when) — this doc adds the missing dimension: *where in the UI* each click/impression pair lives, and which named spec §8.2 categories are and aren't covered. Grounded directly in the current component tree; update it when instrumentation is added or moved, it will drift otherwise.

## How instrumentation works

- **`analytics.track(eventName, fields?)`** (`lib/analytics/client.ts`) — the only way any event reaches the server. `element_id`/`feature_area`/`page_name`/`page_path`/etc. are promoted to first-class DTO columns; anything else rides in the `properties` JSON.
- **`<TrackImpression elementId featureArea elementType>`** (`components/analytics/TrackImpression.tsx`) — wraps a CTA in an `IntersectionObserver`, fires `cta_impression` once per mount when the element scrolls into view. Pairs with a matching `elementId` on a `ui_click` fired from the same element's `onClick`, so `AnalyticsService.getClickstreamAnalytics` can compute CTR = unique clickers ÷ unique viewers (see `docs/ANALYTICS-KPI-DICTIONARY.md` §7).
- **`<PageViewTracker>`** (`components/analytics/PageViewTracker.tsx`) — fires `page_view` once per authenticated route change.
- **`<ErrorTracker>`** (`components/analytics/ErrorTracker.tsx`) — window-level uncaught-error/unhandled-rejection listener, fires `client_error`.

A CTA only shows up in the CTA CTR table (and thus this map's "impression paired?" column) if it's wrapped in `<TrackImpression>`. A click-only element (no impression wrap) still counts toward raw click volume and Clicks per Session, just not CTR.

## Web portal — governed CTAs (spec §8.2/§8.3)

| Screen | CTA | `element_id` | Click event | Impression paired? |
|---|---|---|---|---|
| Dashboard | TeleCare™ quick action | `quick_action_telecare` | `ui_click` | ✅ |
| Dashboard | CareTest™ quick action | `quick_action_caretest` | `ui_click` | ✅ |
| Dashboard | Appointment quick action | `quick_action_appointment` | `ui_click` | ✅ |
| Dashboard | Log Vitals quick action | `quick_action_log_vitals` | `ui_click` | ✅ |
| Dashboard | DispatchCare™ quick action | `quick_action_dispatch` | `ui_click` | ✅ |
| Dashboard | "Export" (vitals CSV) | `export_vitals` | `ui_click` | ❌ (toolbar icon button, not a discretionary CTA) |
| Dashboard | "Reschedule" (Scheduled Care card) | `reschedule_cta` | `ui_click` | ❌ (only rendered when there's an upcoming appointment — conditional visibility makes an impression rate hard to interpret) |
| Dashboard | "Book an appointment" (empty state) | `book_appointment_cta` (via `trackQuickAction`) | `ui_click` | ❌ |
| Dashboard | "Book Consultation" (Your Doctor card) | `book_consultation_cta` (via `trackQuickAction`) | `ui_click` | ❌ |
| Vitals modal | "Save readings" | `save_vitals_cta` | `ui_click` (+ `manual_entry_success` on actual save) | ✅ |
| Appointments | "Request Appointment" | `book_appointment_cta` | `ui_click` (+ full booking funnel: `service_selected`→`booking_started`→`booking_confirmed`/`booking_error`) | ✅ |
| Labs | "Book CareTest™" | `book_caretest_cta` | `ui_click` | ✅ |
| TeleCare | Primary "Join" | `join_telecare_cta` | `ui_click` (+ `telecare_session_join_success`/`_failure`) | ✅ |
| TeleCare | Per-row "Join" (sessions list) | *(shares the same handler/element_id as the primary Join above)* | `ui_click` | ❌ (list row, not a standalone CTA — deliberately not double-wrapped) |
| Payments | "Make Payment" | `make_payment_cta` | `ui_click` (+ `checkout_started`→`payment_pending`→`payment_success`/`payment_failure`) | ✅ |
| Subscriptions | Per-plan CTA | `subscribe_cta_<tier>` (one per plan tier) | `ui_click` (+ `plan_select`→`checkout_start`/`subscription_checkout_error`) | ✅ |
| Vault | Upload dropzone | `upload_record_cta` | `ui_click` (fired on `onFilesSelected`, not on drag-enter) | ✅ |
| Records/Share | "New link" (share wizard) | `share_record_cta` | `ui_click` (only when *opening* the wizard, not when the same button cancels it) (+ `share_start`→`share_success`/`share_failure`) | ✅ |

## Web portal — navigation (spec §8.2 "Navigation menu items")

`Sidebar.tsx` (desktop) and `MobileBottomNav.tsx` (mobile-width web, including the "More" overflow sheet) both derive `element_id` from the route via `navElementId(href)` = `` `nav_${href.replace(/^\//, '').replace(/\//g, '_')}` `` — e.g. `/appointments` → `nav_appointments`, `/expert-review` → `nav_expert_review`. One `ui_click` per nav link, covering every item in `Sidebar.tsx`'s `NAV_ITEMS` (Dashboard, Profile, Appointments, Records, My Vault, CareTest™ Labs, TeleCare™, DispatchCare™, TravelSafe™, Subscriptions, Payments, STRIDE™ AI, Expert Review™, Support — several gated by feature flags). `MobileBottomNav.tsx`'s own "More" overflow toggle has its own fixed id, `nav_more_menu`.

**Deliberately not wrapped in `<TrackImpression>`:** primary nav renders on every authenticated page, so its "impression rate" is always ~100% — a CTR metric only means something for an element a patient might or might not notice, which persistent chrome isn't. Click counts alone are the useful signal here.

## Web portal — notifications (spec §8.2/§15 "Notification links")

`NotificationsPanel.tsx`'s shared `NotificationItem` component fires `notification_clicked` with `element_id: notification_<category>` for every one of the 7 notification categories (appointment/lab/payment/record/telecare/alert/system) — one hook covers all of them since they funnel through the same component.

## Web portal — page/mount-based events (not click-driven)

| Screen | Event | Fires when |
|---|---|---|
| Records | `records_view` | Screen mounts with real data loaded (carries `count`) — fires once per mount via a ref guard, not per render |
| Labs | `result_view` | Screen mounts with real data loaded (carries `count`) |
| Vault | `download` | A document is downloaded (carries `category`) |
| Records | `download` | A clinical record is downloaded (carries `recordType`) |
| Profile | `profile_completed` | Onboarding profile step finishes |
| Every authenticated route | `page_view` | Route change, via `<PageViewTracker>` |
| Anywhere | `client_error` | Uncaught JS error or unhandled promise rejection, via `<ErrorTracker>` |

## Web portal — confirmed non-buildable (spec §8.2 categories with no live UI to instrument)

Quoted from the authoritative in-code comment (`DashboardScreen.tsx`, above the Quick Actions block) rather than re-derived, since it's the single source of truth and was written after direct verification against the live component tree:

- **Per-document Download/Replace/Delete and per-result lab actions** — flat, non-expandable list rows with no reveal interaction to hang a per-item event on. Wrapping a list row in `<TrackImpression>` would count "scrolled past" as "viewed," a different and weaker signal than everywhere else CTR is used.
- **Profile-completion prompts** — `ProfilePanel.tsx` has a read-only completeness ring with no click affordance; there is no "complete your profile" CTA anywhere to instrument.
- **Search results/zero-result actions** — `Topbar.tsx`'s search input and icon button are decorative (no `onChange`/`onClick`, no query state); there is no functioning search feature at all, not merely an uninstrumented one.
- **Device-sync controls** — no wearable/device integration exists anywhere in this codebase.

Any of these becoming real instrumentation targets depends on product building the underlying feature first, not on more analytics work.

## Mobile app — status

**Zero CTA/clickstream instrumentation exists in any mobile screen.** The mobile analytics SDK (`mobile/lib/analytics/client.ts`, ported in an earlier PR, given its first test coverage in `feat/mobile-test-runner`) is fully wired and exports `analytics.track`/`pageView` for screens to call — but no screen in `mobile/app/` currently calls it for a click or impression. The only mobile-side analytics activity today is `getAnonymousVisitorId()` being threaded into `register()`/`verifyOtp()` API calls (mirrors the web's `authStore.ts` registration/OTP server-event pattern) and the SDK's own retry/session/debounce logic (unit-tested). Porting the web portal's CTA/nav instrumentation coverage above to the equivalent mobile screens is a real, sizeable, entirely open gap — not a documentation gap, an implementation one.

## Server-authoritative events (no UI element — see `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` §4)

`login_success`/`login_failure`, `booking_confirmed`, `payment_success`/`payment_failure`, `registration_complete`, `otp_verify_success`/`otp_verify_failure` all have a server-side authoritative emission path in addition to (or instead of) a client beacon — these aren't tied to a specific clickable element and are covered by the event catalog table, not this map.

## Catalogued but never emitted (confirmed while building this map)

`landing_view`, `registration_start`, `registration_step_view`, `registration_step_complete`, `otp_delivery_success`, `otp_delivery_failure`, `terms_viewed`, `terms_accepted`, `privacy_notice_viewed`, `first_meaningful_action` are all present in `analytics-events.catalog.ts` as planned events but have no emitter anywhere in the web portal, mobile app, or API. Most consequentially: **Registration Conversion** (spec §26) cannot be computed today because its denominator event, `registration_start`, is never fired — documented in `docs/ANALYTICS-KPI-DICTIONARY.md` §1 as not currently buildable, not silently left as a zero.
