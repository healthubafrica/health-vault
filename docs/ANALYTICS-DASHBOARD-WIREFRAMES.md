# Analytics Dashboard Wireframes

Spec §32 deliverable: "Dashboard wireframes." These are **as-built** wireframes of the admin analytics dashboard (`health-hub-africa-admin/app/(dashboard)/analytics/page.tsx`) — the dashboard already exists in code, so this documents its real structure rather than proposing a new design. ASCII layout diagrams, not pixel mockups, since no design-tool export exists for this page. Update this doc when the page's section/component structure changes; screenshots would be more visual but would go stale on every UI tweak, while this stays diffable in a PR.

## Global chrome (present on every tab)

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Overview] [Funnels] [Acquisition] [Geography] [Demographics]       │  ← Section tabs (FilterTabs)
│  [Digital Experience] [Security]                          [Export ⬇] │
│                                                                        │
│  [ 7d | 30d | 90d ]                                                   │  ← Period selector (FilterTabs)
├──────────────────────────────────────────────────────────────────────┤
│                          <active section content>                    │
└──────────────────────────────────────────────────────────────────────┘
```

Every metric on every tab responds to the shared period selector except the Demographics tab (explicitly labeled "a population snapshot... not time-windowed like the other tabs" — see below) and MAU (fixed rolling 30-day window regardless of the selector, see `docs/ANALYTICS-KPI-DICTIONARY.md`).

## Overview tab

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│Registrations│ Activation  │ Site visits │Unique login │  Revenue    │
│    1,204    │    rate     │    8,932    │   users     │  ₦2.4M      │
│ 87% verified│    34%      │(anon., mktg)│    891      │last 30d     │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ Registrations and logins                          [line chart]     │
│  ╱‾╲__╱‾‾╲___╱‾╲___                                                 │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ Retention  (cohort definition v1)                                  │
│  D1    D7    D30    D60    D90                                     │
│  62%   41%   28%    19%    14%                                     │
└────────────────────────────────────────────────────────────────────┘
┌───────────────────────────┬────────────────────────────────────────┐
│ Revenue (₦)   [line chart]│ Service usage  [stacked bar, per       │
│                            │ ServiceType, zero-filled columns]      │
└───────────────────────────┴────────────────────────────────────────┘
```

## Funnels tab

The most heavily-filtered tab — 14 spec §J filter dimensions plus date-range comparison, built up incrementally across many PRs this project (see `project_analytics_spec_buildout` memory for the full sequence).

```
┌────────────────────────────────────────────────────────────────────┐
│ Funnels                                            [Export ⬇]      │
│ Step counts for the selected period, in funnel order                │
│                                                                       │
│ [Continent▾][Country▾][Device▾][Age band▾][Plan tier▾][Gender▾]     │
│ [Nationality▾][Browser▾][OS▾][Feature area▾][Timezone▾]             │
│ [Acquisition source▾][UTM campaign▾][Lifecycle stage▾][Off|Compare] │
├────────────────────────────────────────────────────────────────────┤
│ Comparing to the previous 30d: 12 Aug – 11 Sep   ← only if Compare  │
├─────────────┬─────────────┬─────────────┬─────────────┐            │
│ Monthly     │ Clicks per  │ Feature     Adoption                   │  ← Core KPIs row (spec §26)
│ Active      │ Session     │ vault    72% (144/200)                 │
│ Patients    │             │ telecare 41% (82/200)                  │
│    847      │    3.2      │                                        │
│rolling 30d  │             │                                        │
└─────────────┴─────────────┴─────────────┴─────────────┘
┌───────────┬───────────┬───────────┬───────────┬───────────┐
│OTP Verif. │Registered │ Booking   │ Payment   │Activation │  ← Funnel KPI row (+ vs-previous badge when Compare is on)
│  Rate     │→ Verified │Conversion │ Success   │  Rate     │
│   84%     │   78%     │    56%    │    91%    │    38%    │
│172 of 205 │  +6% ▲    │           │           │           │
└───────────┴───────────┴───────────┴───────────┴───────────┘
┌─────────────────┬─────────────────┬─────────────────┐
│ Registration &   │ Booking          │ Payments         │
│ OTP              │                  │                  │
│ registration_    │ service_selected │ checkout_started │
│ complete   1,204 │ booking_started  │ payment_success  │
│ otp_requested    │ booking_confirmed│  (95%)           │
│  1,050 (87%)     │  (56%)           │                  │
└─────────────────┴─────────────────┴─────────────────┘
```

## Acquisition tab

```
┌─────────────────────────────────────┬────────────────────┐
│ How users heard about us             │ Attribution rate   │
│ Direct        ████████████░░  62%    │      41%            │
│ Partner       ██████░░░░░░░░  28%    │  822 of 2,004      │
│ Campaign      ██░░░░░░░░░░░░  10%    │  registrations     │
└───────────────────────────────────────┴────────────────────┘
┌────────────────────────────────────────────────────────────┐
│ Campaign performance                            [Export ⬇] │
│  Campaign      Source     Registrations   Conversion        │
│  ────────────────────────────────────────────────           │
│  spring-promo  facebook        142            34%            │
└────────────────────────────────────────────────────────────┘
```

## Geography tab

```
┌──────────────────────────────────────────────────────────────────┐
│ Global portal map                    [Access|Declared] [Metric▾] │
│ Where portal sessions connect from — approximate, IP-derived...   │
│                                                                     │
│              [choropleth world map, log/linear color scale]       │
│                                                                     │
│  Not drawable (no 110m polygon): SG, MU, MT, BH, XK, ...           │
└──────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ Declared vs Access Geography                                       │
│  Declared      Access        Patients   Match?                     │
│  Nigeria       Nigeria         842        ✓                        │
│  Nigeria       United Kingdom   12        ✗ (diaspora)              │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ Country → Region → City (marketing-site traffic, expandable tree)  │
│  ▸ Africa                                                            │
│    ▸ Nigeria (4,821 visits)                                         │
│      ▸ Lagos (2,104)                                                 │
└────────────────────────────────────────────────────────────────────┘
```

## Demographics tab

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│Active       │ Top age     │Top          │ Top plan    │
│patients     │ band        │nationality  │             │
│   2,847     │  25–34      │  Nigerian   │   Free      │
└─────────────┴─────────────┴─────────────┴─────────────┘
┌───────────────────────┬───────────────────────┐
│ Age bands              │ Sex / gender (as       │
│ 25–34  ████████  920   │ collected)             │
│ 18–24  █████░░░  540   │ Female ██████░  1,520  │
├───────────────────────┼───────────────────────┤
│ Nationality             │ Subscription plan tier │
│ Nigerian ████████ 2,401│ Free    ████████ 1,900 │
└───────────────────────┴───────────────────────┘
```

## Digital Experience tab

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│Portal events│ Top device  │ Top browser │Client error │
│   48,204    │  Desktop    │   Chrome    │   rate      │
│             │             │             │    0.8%     │
└─────────────┴─────────────┴─────────────┴─────────────┘
┌───────────────────────┬───────────────────────┐
│ Portal devices          │ Portal browsers         │
│ Desktop ████████ 28,204│ Chrome  ████████ 30,102│
└───────────────────────┴───────────────────────┘
┌────────────────────────────────────────────────────────┐
│ Top client errors                              [Export]│
│  Message                                    Occurrences │
│  TypeError: x is undefined                      142      │
└────────────────────────────────────────────────────────┘
```

## Security tab

```
┌────────────────────────────────────────────────────────────────────┐
│ Login failure trends                          [line chart]          │
├────────────────────────────────────────────────────────────────────┤
│ Login location anomalies                                            │
│  User            From          To            When                   │
│  admin@hha.com   Nigeria       Germany       2 hours ago             │
└────────────────────────────────────────────────────────────────────┘
```

## What isn't wireframed here

- **The patient-facing portal** (`health-hub-africa`) has no analytics-specific dashboard of its own — analytics there is purely instrumentation (see `docs/ANALYTICS-CLICKSTREAM-MAP.md`), not a UI a patient sees.
- **Mobile has no analytics dashboard at all** — same reasoning, mobile only emits events, it doesn't display any.
- Component-level styling (colors, spacing, exact chart libraries) isn't reproduced here — that's `Chart.js` via `react-chartjs-2` and the shared `Card`/`Metric`/`FilterTabs` components already in `health-hub-africa-admin/components/ui/`, unchanged by this documentation effort.
