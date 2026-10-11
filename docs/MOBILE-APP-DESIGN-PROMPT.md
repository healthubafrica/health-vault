# MyHealth Vault+ Mobile — Banani Design Prompt

> Paste the block below (everything between the `START PROMPT` / `END PROMPT` markers) into Banani as your project brief. It's written to give a design agent the same context a human designer would get from a product brief + brand guide + IA doc in one pass. Source: [`MOBILE-APP-IMPLEMENTATION-PLAN.md`](./MOBILE-APP-IMPLEMENTATION-PLAN.md) and the live design tokens in `health-hub-africa/app/globals.css`.

---

## START PROMPT

### Product

**MyHealth Vault+** is the mobile companion app for Health Hub Africa, a healthcare platform serving patients across Africa (initial market: South Africa). The app gives patients a single place to manage their health: book and attend appointments (including video TeleCare), view lab results and prescriptions, track vitals, store and share medical documents, request emergency dispatch, and pay for care. It talks to an existing production API — this is a new client on an established backend, not a greenfield product, so the UI needs to feel trustworthy and clinically credible from screen one, not like an early-stage startup app.

**Users are patients, not clinicians** — ages roughly 18–75, mixed digital literacy, often on mid-range Android devices and inconsistent mobile data. Design for clarity and large tap targets over density. A meaningful share of sessions happen while someone is anxious (waiting on results, managing a chronic condition, mid-emergency) — the UI should stay calm and legible under stress, never cluttered or playful in tone.

### Design Direction

Direction: **"Clinical-Premium"** — grounded and trustworthy like a well-run private clinic, not sterile hospital-white, not a flashy consumer-startup gradient. Warm off-white/soft-sage surfaces, a deep forest-green primary that reads as competence and calm (not the generic "medical blue"), a muted gold accent reserved for premium/subscription moments, and a single, unambiguous red reserved *only* for emergency actions — never used decoratively elsewhere so it keeps its urgency.

Avoid generic template UI: no default card-grid dashboards with uniform spacing and no hierarchy, no centered-hero-with-gradient-blob patterns, no flat single-accent-color layouts. Every screen should show at least a few of: clear scale contrast in hierarchy, intentional (not uniform) spacing rhythm, soft layering/elevation between surfaces, a real typographic pairing (not one weight repeated everywhere), color used semantically (status, not decoration), and designed hover/press states.

### Visual System

**Color palette** (light mode primary; also design a dark mode using the mapped values below):

| Token | Light | Dark | Usage |
|---|---|---|---|
| Primary | `#137333` (deep forest green) | keep primary, darken surfaces around it | Primary actions, active nav state, brand moments |
| Primary Dark | `#0E4A30` | — | Pressed states, headers |
| Primary Light | `#EBF5EC` | `#1E3A1E` | Tinted backgrounds behind primary content (e.g. selected chips) |
| Gold accent | `#B59410` | keep, reduce saturation slightly on dark | Subscription/premium badges, plan upgrade CTAs only — used sparingly |
| Emergency red | `#C0392B` | keep | **Reserved exclusively** for the Emergency/DispatchCare action and true error states — never a general accent |
| Emergency light | `#FDECEA` | `#2A1010` | Background tint behind emergency banners only |
| Background | `#F4F6F5` | `#111811` | App background |
| Surface / Card | `#FFFFFF` | `#1A251A` | Cards, sheets, modals |
| Text primary | `#1A1A1A` | `#D0E8D0` | Body/headings |
| Text muted | `#6B6B6B` | `#8A9A8A` | Secondary text, timestamps, helper copy |
| Text faint | `#A0A0A0` | `#556655` | Disabled/placeholder |
| Border | `#EBEFEF` | `#253525` | Card borders, dividers |
| Success | `#6DC43F` on `#EAF5E2` bg, text `#006022` | `#8AE659` on `#1E3A1E` bg | Vitals "Green" status, confirmed states |
| Warning | `#E8930A` on `#FFF4E0` bg, text `#92610a` | `#F5B041` on `#2A2010` bg | Vitals "Amber" status, pending/attention states |
| Error | `#C0392B` on `#FDECEA` bg | `#F5B041`→ use error tokens on `#2A1010` bg | Vitals "Red" status, failed states |
| Info | `#1565c0` on `#e3f2fd` bg | `#64B5F6` on `#102030` bg | Neutral informational banners |

**Typography:** Manrope for everything (display and body) — a geometric-humanist sans that reads as modern but warm, not corporate-cold. Establish a clear type scale: large confident numerals for vitals/metrics, a distinct heading weight from body weight, and generous line-height (1.5+) for anything patients read while anxious (results, instructions).

**Shape & elevation:** Rounded cards at a generous radius (~20–24px) — soft, approachable, not sharp/clinical. Subtle shadow/elevation to separate cards from the background rather than hard borders alone. Buttons fully rounded or large-radius, never sharp rectangles.

**Iconography:** Rounded-line icon set, friendly but precise — avoid literal clip-art medical icons (stethoscopes, red crosses everywhere); prefer abstract/geometric icons for navigation and reserve literal medical iconography (pill, syringe, heart-pulse) for content contexts where it aids scanning (records list, medication cards).

**Motion:** Subtle, purposeful — screen transitions and loading skeletons (shimmer, matching the web app's existing skeleton pattern), never decorative animation that delays getting to information. Respect reduced-motion settings.

### Platform & Layout Rules

- Design for **iOS and Android** as one shared visual language with native platform conventions respected (iOS: swipe-back, bottom sheet modals with grabber; Android: system back button behavior, material-style ripples acceptable on press).
- **Bottom tab bar, 5 tabs**: Home, Vitals, Records, TeleCare, Profile — plus a **persistent floating Emergency action** (not a 6th tab) reachable from every screen, styled unmistakably in the reserved emergency red, positioned so it can never be confused with a routine action.
- Respect safe areas top and bottom on all screens (notch/Dynamic Island, home indicator, gesture nav bar).
- Minimum tap target 44×44pt (iOS) / 48×48dp (Android) — this audience skews toward larger targets, not compact/dense UI.
- Support both light and dark mode from the start using the token table above — do not treat dark mode as an afterthought.
- Design empty, loading, and error states for every data screen, not just the happy path — this is a healthcare app; a broken-looking blank screen erodes trust fast.

### Information Architecture

```
Auth (pre-login): Splash → Login → Register → OTP Verify → Forgot Password → Reset Password → Biometric Setup Prompt

Post-login, bottom tabs:
├── Home            — greeting, "Check My Vitals" CTA, today's appointments, recent activity, quick actions
├── Vitals           — trend list (color-coded Green/Amber/Red), record new reading, per-metric detail/history
├── Records           — tabs/sub-nav: Documents, Prescriptions, Results, Visit Notes
├── TeleCare           — upcoming sessions, join flow, waiting room, in-call screen, guest invite
└── Profile            — account info, settings, notification preferences, sessions/devices, connected health apps (HealthKit/Health Connect), subscription/plan, support

Persistent (not in tabs):
├── Emergency          — floating action from anywhere → Emergency Profile + DispatchCare request
├── Services Hub        — HHA service catalogue: DispatchCare, MinuteCare, CareTest, Expert Review, TravelSafe
├── Notifications Center — bell icon from Home, list of in-app alerts
├── Share Record        — generate a time-limited share link/QR from any record
├── Document Scan        — camera-based document capture modal
└── Payment/Checkout      — appointment/service payment flow
```

### Screens to Design (in priority order — generate these first)

For each screen below, treat the bullet list as required content elements, not decoration to pick from — the layout should surface all of them with clear hierarchy.

**1. Splash / Login**
- App logo on brand-primary background, tagline
- Login: email + password fields, "Forgot password?" link, biometric quick-login option (Face ID/fingerprint icon) if a session was previously saved, primary CTA "Log In", secondary "Create Account"

**2. Register**
- Name, email, phone, password + confirm, newsletter opt-in checkbox, terms/consent checkbox, primary CTA "Create Account"

**3. OTP Verify**
- 6-digit code input (auto-advance boxes), countdown + "Resend code" link, context copy showing which email/phone the code was sent to

**4. Home / Dashboard**
- Personalized greeting with patient name
- Primary CTA row: "Check My Vitals", "Talk to a Doctor", "Book Care" — large, thumb-reachable, visually distinct from each other
- "Today" section: any appointment happening today, prominent with a Join/Details action
- Recent activity feed: latest lab result, prescription update, payment receipt — each as a compact card with icon, title, timestamp, status pill
- Notification bell with unread-count badge in the header

**5. Vitals List**
- Latest reading per metric (heart rate, blood pressure, SpO₂, temperature, respiratory rate, weight/BMI, glucose, pain score) as a card grid, each card color-tinted by status (Green/Amber/Red) with the metric's big numeral, unit, and a mini trend sparkline
- Floating "+ Record Vitals" action
- Each card tappable into a full trend-history detail screen (line chart + list of past readings with source badge: manual/imported/device)

**6. Record Vitals (entry flow)**
- Metric picker, numeric input with unit, optional note, explicit "Source: Manual entry" label, Save CTA
- Confirmation state showing the value against its Green/Amber/Red threshold

**7. Appointments List**
- Upcoming vs. Past segmented control/tabs
- Each appointment as a card: provider name/photo, specialty, date/time, type (in-person/TeleCare), status pill (confirmed/pending/cancelled), primary action (Join/Reschedule/Cancel depending on state)
- Floating "Book Appointment" action

**8. Book Appointment (multi-step flow)**
- Step 1: service/specialty selection
- Step 2: provider search/list (filter by specialty, location, language, availability)
- Step 3: date/time slot picker
- Step 4: confirm + payment summary
- Progress indicator across steps

**9. Records Hub**
- Sub-navigation: Documents / Prescriptions / Results / Visit Notes
- Documents: grid/list of uploaded files with type icon, upload date, "Scan Document" and "Upload" actions
- Prescriptions: list with medication name, dosage, prescribing provider, refill-status pill, "Request Refill" action
- Results: list with test name, date, status pill (ready/pending), tap into detail with values plotted against reference ranges
- Visit Notes / After-Visit Summary: chronological list, tap into full note detail

**10. Record Detail / Share**
- Full document or result view
- "Share" action opening a bottom sheet: generate time-limited link, set expiry, notify recipient by email/SMS, show a QR code, and a clear "link won't be shown again" security notice
- "Who's Accessed This?" access-log list (name/date/method)

**11. TeleCare — Upcoming & Waiting Room**
- Upcoming session card with countdown to start time, device-check status, "Join" CTA (disabled/greyed until join window opens)
- Waiting room: camera preview, mic/camera toggle, "Waiting for provider to join" state

**12. TeleCare — In Call**
- Full-screen video, self-view picture-in-picture, call controls (mute, camera off, end call, chat/notes if applicable), session timer

**13. Emergency**
- Reachable via the persistent floating action from any screen
- Emergency Profile summary: blood group, allergies, current medications, chronic conditions, emergency contacts — dense but scannable, works fully offline
- Prominent "Request DispatchCare" CTA in emergency red, requiring explicit confirmation (not a silent one-tap trigger)

**14. Services Hub**
- Grid/list of HHA services: DispatchCare, MinuteCare, CareTest, Expert Review (second opinion), TravelSafe — each with icon, one-line description, "Book" action

**15. Notifications Center**
- Chronological list grouped by day, unread items visually distinct, category icon (appointment/lab/payment/system), tap-through to the relevant screen, "Mark all as read" action

**16. Profile / Settings**
- Avatar + name/plan-tier header
- Sections: Personal Info, Security (biometric toggle, change password, 2FA), Sessions & Devices (list of logged-in devices with "This device" flag and revoke action), Notification Preferences (channel toggles: push/email/SMS/in-app, per category), Connected Health Apps (Apple Health / Health Connect connection status), Subscription/Plan, Preferred Pharmacy, Support/Help, Log Out

**17. Document Scan (modal)**
- Camera viewfinder with auto-detected document edges/corners overlay, capture button, retake/confirm, crop-adjust step before upload

**18. Payment / Checkout**
- Order summary (service/appointment being paid for), payment method selection, total with any breakdown, primary "Pay Now" CTA, success/failure confirmation states

### Component Notes (establish these as reusable patterns across screens)

- **Status pill**: rounded, colored background per state (green/amber/red/info) using the semantic tokens above — used consistently for appointment status, vitals status, lab result status, refill status
- **Activity/record card**: consistent anatomy across Home, Records, Notifications — leading icon, title, meta line (date/provider), trailing status pill or chevron
- **Emergency floating action**: fixed position, red, unmistakable, never used for any non-emergency action
- **Bottom sheet**: for Share, Filter, and confirmation flows — grabber handle, rounded top corners, backdrop dim
- **Empty state**: friendly illustration + one-line explanation + relevant CTA (e.g., no appointments yet → "Book your first appointment")
- **Skeleton loading**: shimmer placeholders matching card shapes, not spinners, for list/data screens

### Accessibility

- Meet WCAG AA contrast for all text/background pairs, including inside status-pill colors
- Support OS-level dynamic type / font scaling without breaking card layouts
- All icon-only buttons need accessible labels (VoiceOver/TalkBack)
- Never convey status by color alone — pair every status pill with a text label
- Respect "reduce motion" OS setting

### What to avoid

- Generic dashboard-by-numbers layout (sidebar+cards+charts with no point of view)
- Sterile all-white hospital aesthetic, or the opposite — an overly playful consumer-startup look that undermines clinical trust
- Using the emergency red anywhere except the Emergency action and true errors
- Decorative gradients/blobs with no functional purpose
- Dense, small-target UI — this audience needs generous spacing and large touch targets over information density

## END PROMPT

---

## Notes for using this in Banani

- If Banani's input has a length limit, prioritize keeping: **Design Direction, Visual System, Platform & Layout Rules, and Screens 1–10** (the V1 priority set from the implementation plan's §14 phasing) — the rest (Services Hub, Payment, Document Scan) can be a follow-up generation pass once the core flows look right.
- Feed screens one batch at a time if Banani generates better results from a smaller prompt per generation — the doc above is already ordered by priority so you can slice it (e.g., paste the "Product" + "Design Direction" + "Visual System" once as project-level context if Banani supports that, then paste one screen bullet block per generation).
- After first-pass generation, cross-check against [`MOBILE-APP-IMPLEMENTATION-PLAN.md`](./MOBILE-APP-IMPLEMENTATION-PLAN.md) §9 (Screen & Navigation Architecture) and §6 (Portal-to-Mobile Feature Parity Matrix) to make sure nothing P0 got dropped.
