# Admin Dashboard PRD
## Health Hub Africa — Internal Operations Platform

**Version:** 1.0  
**Status:** Draft  
**Authors:** HHA Engineering  
**Last Updated:** 2026-06-19

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Users & Roles](#3-users--roles)
4. [Architecture & Technical Decisions](#4-architecture--technical-decisions)
5. [Feature Modules](#5-feature-modules)
6. [Screen Inventory](#6-screen-inventory)
7. [Role Access Matrix](#7-role-access-matrix)
8. [API Requirements](#8-api-requirements)
9. [Design Direction](#9-design-direction)
10. [Directory Structure](#10-directory-structure)
11. [Non-Goals](#11-non-goals)
12. [Open Questions](#12-open-questions)

---

## 1. Overview

### Problem

The Health Hub Africa platform manages patients, providers, clinical records, appointments, lab orders, emergency dispatch, expert review cases, subscription billing, and OpenEMR integration — entirely through API endpoints. There is no internal operations interface. Staff must interact directly with the database or use raw API calls to perform administrative tasks, monitor system health, or surface business KPIs.

### Solution

Build a comprehensive **internal admin dashboard** for HHA operations staff. The dashboard is an authenticated web application accessible only to users with roles `admin`, `super_admin`, or `coordinator`. It provides:

- Real-time KPI monitoring (revenue, usage, subscriptions)
- Patient and provider lifecycle management
- End-to-end operations visibility across all 7 service types
- OpenEMR sync queue monitoring and error recovery
- Audit log access and system health monitoring

### Scope

The admin dashboard is a **standalone Next.js application** in its own directory (`health-hub-africa-admin/`), deployed independently at `admin.myvaultplus.com`. It is not a route group inside the patient portal — it has its own `package.json`, `next.config.ts`, and `middleware.ts`.

Its visual system is **bootstrapped from the patient dashboard** (`health-hub-africa`): the Tailwind v4 token file (`globals.css`), font stack (Manrope + JetBrains Mono), dark mode setup, and base UI components (`Button`, `Card`, `KpiCard`, `ListRow`, `Pill`, etc.) are all copied across as the foundation. Dark mode is set as the permanent default — the admin app has no light/dark toggle.

---

## 2. Goals & Success Metrics

### Goals

| # | Goal |
|---|------|
| G1 | Give HHA staff visibility into all service operations without direct database access |
| G2 | Surface revenue and subscription KPIs in real-time to inform business decisions |
| G3 | Enable coordinators to manage expert review and support queues independently |
| G4 | Reduce OpenEMR sync failure recovery time from manual intervention to one-click retry |
| G5 | Provide a full audit trail for compliance and incident investigation |

### Success Metrics

| Metric | Target |
|--------|--------|
| Time to resolve a failed OpenEMR sync | < 2 minutes (from error to retry click) |
| Time for admin to locate a patient and view their full record | < 30 seconds |
| Dashboard load time (KPI overview) | < 1.5s (LCP) |
| Role-based access accuracy | 100% — no coordinator can access super-admin features |
| Coordinator can assign expert review case without engineering help | Yes |

---

## 3. Users & Roles

### Role Definitions

The platform has 5 user roles. The admin dashboard serves 3 of them:

| Role | Description | Access Level |
|------|-------------|--------------|
| `super_admin` | Root HHA staff. Full access including role assignment, audit logs, and all system controls. | Unrestricted |
| `admin` | HHA operations staff. User management, analytics, all service operations, system health. Cannot change roles or view raw audit logs. | High |
| `coordinator` | Case coordinators. Manage expert review queues, dispatch operations, and support tickets. Limited user visibility. | Medium |

Roles `patient` and `provider` are explicitly excluded from admin dashboard access.

### Persona Summaries

**Super Admin (Emeka — Head of Operations)**
- Needs to change user roles, investigate incidents via audit logs, monitor financial health, and manage system integrations. Uses the dashboard daily.

**Admin (Aisha — Operations Manager)**
- Manages day-to-day service ops: checking for stuck appointments, monitoring telecare session volumes, reviewing subscription churn. Runs analytics weekly.

**Coordinator (Ngozi — Expert Review Coordinator)**
- Assigns specialist cases, monitors the expert review queue, handles support tickets. Uses the expert review and support screens exclusively.

---

## 4. Architecture & Technical Decisions

### 4.1 Placement

The admin dashboard is a **standalone Next.js 16 application** at:

```
Health Hub Africa/
├── health-hub-africa/          ← Patient portal (unchanged)
├── health-hub-africa-admin/    ← Admin dashboard (new, standalone)
├── health-hub-africa-api/      ← NestJS backend (shared)
└── myvaultplus-web/            ← Marketing site (unchanged)
```

It shares no runtime code with `health-hub-africa` — but its styling, component patterns, and visual tokens are **bootstrapped by copying** from the patient portal. After initial setup, both projects evolve independently.

**Deployment:**

- Patient portal: `portal.myvaultplus.com`
- Admin dashboard: `admin.myvaultplus.com`
- API: `api.myvaultplus.com` (shared backend)

### 4.2 Style Bootstrap (from Patient Dashboard)

The following are **copied** from `health-hub-africa` at project creation and serve as the admin's style foundation:

| Source file | Destination | What it provides |
| ----------- | ----------- | ---------------- |
| `app/globals.css` | `app/globals.css` | All Tailwind v4 `@theme` tokens — colors, fonts, animations, scrollbar styles |
| `components/ui/Button.tsx` | `components/ui/Button.tsx` | All 6 button variants |
| `components/ui/Card.tsx` | `components/ui/Card.tsx` | Card primitive |
| `components/ui/KpiCard.tsx` | `components/ui/KpiCard.tsx` | KPI metric card |
| `components/ui/ListRow.tsx` | `components/ui/ListRow.tsx` | List item row |
| `components/ui/Pill.tsx` | `components/ui/Pill.tsx` | Status badge |
| `components/ui/Skeleton.tsx` | `components/ui/Skeleton.tsx` | Loading placeholder |
| `components/ui/FilterTabs.tsx` | `components/ui/FilterTabs.tsx` | Tab filter bar |
| `components/ui/Avatar.tsx` | `components/ui/Avatar.tsx` | Profile image |
| `lib/utils.ts` | `lib/utils.ts` | `cn()` utility |

**Dark mode is permanent.** The `<html>` element gets `class="dark"` hardcoded in the root layout — no `next-themes` toggle. All Tailwind `.dark` overrides in `globals.css` apply site-wide.

### 4.3 Admin Layout (AdminShell)

New component `components/layout/AdminShell.tsx`, modelled after `health-hub-africa`'s `AppShell.tsx` pattern:

- **Dark sidebar** (240px expanded / 64px icon-only collapsed) — `bg-[#0B1A0D]`
- **Top bar** with breadcrumb trail, admin user avatar, and notification bell
- **Main content area** — full-width, scrollable, no right panel
- **Responsive:** sidebar collapses on tablet (`md`); icon-strip bottom nav on mobile

### 4.4 Authentication & Route Protection

Own `middleware.ts` in the admin project — same cookie-based JWT check as the patient portal:

1. All routes require a valid `hha_at` cookie
2. Decoded JWT `role` must be one of: `admin`, `super_admin`, `coordinator`
3. Any other role → redirect to `https://portal.myvaultplus.com` (not the admin login)
4. Unauthenticated → redirect to `/login` (admin's own login page)
5. Role-restricted routes (e.g. `/system/audit-logs`) perform a secondary role check inside the page component and render a `403` state if insufficient

The admin login page reuses the same `auth.login()` API call. Token storage is identical (secure HTTP-only cookies `hha_at` / `hha_rt`).

### 4.5 State Management

| Store | File | Purpose |
|-------|------|---------|
| `useAuthStore` | `lib/stores/authStore.ts` | Copied from patient portal — current user, role, login/logout |
| `useAdminStore` | `lib/stores/adminStore.ts` | Sidebar collapse, active filters, pagination cursor |

### 4.6 API Client

`lib/api.ts` — copied from `health-hub-africa/lib/api.ts` and trimmed to admin-relevant endpoints. Points to the same `NEXT_PUBLIC_API_URL` backend. All admin-specific calls go through the same fetch wrapper (auth headers, 401 refresh, error normalisation).

### 4.7 Dependencies

Mirrors `health-hub-africa` package versions exactly for consistency:

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.x | Framework |
| `react` / `react-dom` | 19.x | UI runtime |
| `tailwindcss` | v4 | Styling |
| `zustand` | latest | State |
| `chart.js` + `react-chartjs-2` | latest | Charts |
| `lucide-react` | latest | Icons |
| `sonner` | latest | Toasts |
| `@radix-ui/react-dialog` | latest | Modals |
| `@radix-ui/react-select` | latest | Dropdowns |
| `react-hook-form` + `zod` | latest | Forms |
| `framer-motion` | latest | Animations |
| `next-themes` | — | Not included (dark mode is hardcoded) |

---

## 5. Feature Modules

### Module 1 — Overview Dashboard

**Route:** `/admin`  
**Purpose:** Command center. Single-glance health of the platform.

**KPI Cards (top row):**
- Total Active Patients (change vs. last 30 days)
- Monthly Recurring Revenue (MRR)
- Active Subscriptions by Tier (stacked bar)
- Open Dispatch Requests (live count)
- Expert Review Cases In Progress
- OpenEMR Sync Failures (last 24h)

**Activity Feed (right column):**
- Chronological stream of: new registrations, completed appointments, payments received, failed syncs, dispatch events — last 50 events

**Charts:**
- New user registrations (7-day line chart)
- Service usage by type (7-day bar chart)
- Revenue by gateway (Paystack vs Flutterwave) — donut

---

### Module 2 — User & Patient Management

**Routes:** `/admin/users`, `/admin/users/[id]`  
**Purpose:** Find any user, view their full profile, and manage their account.

**User List (`/admin/users`):**
- Table columns: Avatar, Name, Email, HHA Patient ID, Role, Status (active/inactive), Subscription Tier, Joined Date, Actions
- Search: full-text on name, email, patient ID
- Filters: Role (all / patient / provider / coordinator / admin), Status (active / inactive), Subscription Tier, Date range (joined)
- Bulk actions (Super Admin only): Activate / Deactivate selected
- Export: CSV download of filtered results

**User Detail (`/admin/users/[id]`):**

Tabs:
1. **Profile** — Personal info, medical info, emergency contacts, profile photo, OpenEMR UUID
2. **Subscription** — Current plan, billing history, plan change (Admin)
3. **Appointments** — All appointments, status, provider
4. **Records** — Uploaded clinical records (link to S3, not raw file)
5. **Payments** — Payment history, invoice downloads
6. **Audit Trail** — All actions taken by or on this user (Super Admin only)
7. **Account Actions** — Activate/Deactivate, Change Role (Super Admin only), Send Password Reset, Revoke All Sessions

---

### Module 3 — Analytics & KPIs

**Route:** `/admin/analytics`  
**Purpose:** Revenue, usage, and growth intelligence.

**Revenue Section:**
- MRR trend (30/60/90/180 days — line chart)
- Revenue breakdown by subscription tier (stacked area)
- Revenue by payment gateway (Paystack vs Flutterwave — bar chart)
- Top-line metrics: Total Revenue, Average Revenue Per User (ARPU), Churn Rate

**Subscription Section:**
- Active subscriptions by tier (donut)
- New subscriptions vs. cancellations (line chart)
- Subscription tier movement (upgrades/downgrades — Sankey or grouped bar)

**Service Usage Section:**
- Service calls by type over time (7 service types — grouped bar)
- TeleCare session duration average
- Expert review case resolution time average
- Dispatch response time average

**User Growth Section:**
- New registrations over time (line chart)
- Daily/Monthly Active Users (DAU/MAU)
- Retention: users still active at 7/14/30 days after signup

**Date range picker:** Presets (7d, 30d, 90d, 180d, 1y) + custom range

---

### Module 4 — Service Operations

All service operation screens share a common layout pattern:
- FilterTabs (by status)
- Searchable data table with sortable columns
- Row actions (view detail, change status, escalate)
- Detail side panel or modal with full record

#### 4a. Appointments (`/admin/operations/appointments`)

**Table columns:** Patient, Provider, Service Type, Scheduled At, Status, Actions  
**Statuses:** requested → confirmed → upcoming → in_progress → completed / cancelled / no_show  
**Actions:** View detail, Cancel (with reason), Mark no-show  
**Filters:** Status, Service Type, Provider, Date range

#### 4b. TeleCare Sessions (`/admin/operations/telecare`)

**Table columns:** Patient, Provider, Session ID, Started At, Duration, Status, LiveKit Room, Notes  
**Statuses:** scheduled / active / completed / abandoned  
**Actions:** View session notes, View LiveKit room status  
**Filters:** Status, Provider, Date range

#### 4c. Expert Review Cases (`/admin/operations/expert-review`)

**Table columns:** Case ID, Patient, Service Type, Submitted At, Status, Assigned Coordinator, Specialists Assigned, Report Ready  
**Statuses:** submitted → under_review → specialist_assigned → in_consultation → report_ready → closed / cancelled  
**Actions:** Assign coordinator, Add specialist note, Mark report ready, Close case  
**Filters:** Status, Coordinator, Date range  
**Coordinator access:** Can view queue, assign themselves, update case status

#### 4d. Dispatch Requests (`/admin/operations/dispatch`)

**Table columns:** Request ID, Patient, Location, STRIDE Triage Level, Status, Unit Assigned, Events  
**Statuses:** requested → triaged → unit_assigned → en_route → on_scene → patient_stabilised → transported → closed  
**Live indicator:** Active dispatches highlighted (pulse animation)  
**Actions:** View event timeline, Close request  
**Filters:** Status, Triage Level, Date range

#### 4e. Lab Orders (`/admin/operations/labs`)

**Table columns:** Order ID, Patient, Tests, Ordered At, Status, Flags, Provider  
**Statuses:** pending → normal / review / critical  
**Flags:** Critical results highlighted in red (same `Pill` component as existing)  
**Actions:** View result items, Flag for review  
**Filters:** Status, Flag level, Date range

---

### Module 5 — OpenEMR Sync & System Health

#### 5a. Sync Queue (`/admin/system/sync`)

**Purpose:** Monitor the OpenEMR integration queue (backed by `OpenemrSyncQueue` table + Bull queue).

**Stats row (top):**
- Pending jobs
- Processing jobs
- Completed today
- Failed (last 24h) — highlighted in red if > 0

**Queue table columns:** Job ID, Entity Type (patient / record / lab / encounter / vitals), Entity ID, Queued At, Attempts, Status, Last Error  
**Statuses:** pending / processing / completed / failed  
**Actions:**
- Retry failed job (calls `POST /admin/system/sync/:id/retry`)
- Dismiss failed job (marks as acknowledged)
- View full error payload (expandable row)

**Filters:** Status, Entity Type, Date range

#### 5b. Integration Errors (`/admin/system/errors`)

**Purpose:** View `IntegrationError` table — all errors thrown during OpenEMR API calls.

**Table columns:** Error ID, Service (openemr / paystack / livekit), Operation, Occurred At, Message, Resolved  
**Actions:** Mark as resolved, Copy error payload  
**Filters:** Service, Resolved (yes/no), Date range

#### 5c. System Health (`/admin/system/sync` — health panel)

Status badges for external services:

| Service | Check Method | Badge |
|---------|-------------|-------|
| OpenEMR API | Call `GET /openemr/health` | Online / Degraded / Down |
| Paystack | Call `GET /payments/health` | Online / Down |
| Africa's Talking SMS | Ping endpoint | Online / Down |
| LiveKit | Check active rooms API | Online / Down |
| Redis | Check queue worker heartbeat | Online / Down |

Refreshes every 60 seconds. Manual refresh button.

#### 5d. Audit Logs (`/admin/system/audit-logs`)

**Access:** Super Admin only  
**Purpose:** Full `AuditLog` table — every mutation on the platform.

**Table columns:** Timestamp, User (name + role), Action, Resource Type, Resource ID, IP Address, User Agent  
**Filters:** User, Action, Resource Type, Date range  
**Export:** CSV download  
**Search:** Free text on action, resource ID

---

### Module 6 — Facilities

**Route:** `/admin/facilities`  
**API:** Existing endpoints (`GET/POST/PATCH /admin/facilities`)

**List view:** Facility name, type, location, provider count, active status  
**Actions:** Create facility, Edit facility, Assign providers to facility  
**Detail panel:** Facility info + list of assigned providers

---

### Module 7 — Support Tickets

**Route:** `/admin/support`  
**Purpose:** View and manage `SupportMessage` records.

**List view columns:** Ticket ID, Patient, Subject, Submitted At, Status (open/in_progress/resolved), Assigned To  
**Detail panel:** Full message thread, assignment, status change, internal notes  
**Actions:** Assign to staff member, Change status, Add internal note  
**Filters:** Status, Assigned To, Date range  
**Coordinator access:** Full access to support queue

---

## 6. Screen Inventory

| # | Route | Screen Name | Roles With Access |
|---|-------|-------------|-------------------|
| 1 | `/admin` | Overview Dashboard | Coordinator (limited), Admin, Super Admin |
| 2 | `/admin/users` | User Management — List | Admin, Super Admin |
| 3 | `/admin/users/[id]` | User Detail | Admin, Super Admin |
| 4 | `/admin/analytics` | Analytics & KPIs | Admin, Super Admin |
| 5 | `/admin/operations/appointments` | Appointments | Admin, Super Admin |
| 6 | `/admin/operations/telecare` | TeleCare Sessions | Admin, Super Admin |
| 7 | `/admin/operations/expert-review` | Expert Review Queue | Coordinator, Admin, Super Admin |
| 8 | `/admin/operations/dispatch` | Dispatch Operations | Admin, Super Admin |
| 9 | `/admin/operations/labs` | Lab Orders | Admin, Super Admin |
| 10 | `/admin/system/sync` | OpenEMR Sync Monitor | Admin, Super Admin |
| 11 | `/admin/system/errors` | Integration Errors | Admin, Super Admin |
| 12 | `/admin/system/audit-logs` | Audit Logs | Super Admin only |
| 13 | `/admin/facilities` | Facilities | Admin, Super Admin |
| 14 | `/admin/support` | Support Tickets | Coordinator, Admin, Super Admin |

---

## 7. Role Access Matrix

| Feature | Coordinator | Admin | Super Admin |
|---------|:-----------:|:-----:|:-----------:|
| **Overview Dashboard** | ✓ (limited) | ✓ | ✓ |
| Overview — financial KPIs | — | ✓ | ✓ |
| **User List** | — | ✓ | ✓ |
| User Detail — profile | — | ✓ | ✓ |
| User Detail — payments | — | ✓ | ✓ |
| User Detail — audit trail | — | — | ✓ |
| User — activate/deactivate | — | ✓ | ✓ |
| User — change role | — | — | ✓ |
| **Analytics** | — | ✓ | ✓ |
| **Appointments** | — | ✓ | ✓ |
| **TeleCare Sessions** | — | ✓ | ✓ |
| **Expert Review** (view + assign) | ✓ | ✓ | ✓ |
| Expert Review — close/cancel | — | ✓ | ✓ |
| **Dispatch** | — | ✓ | ✓ |
| **Lab Orders** | — | ✓ | ✓ |
| **Sync Queue** | — | ✓ | ✓ |
| **Integration Errors** | — | ✓ | ✓ |
| **Audit Logs** | — | — | ✓ |
| **Facilities** (view) | — | ✓ | ✓ |
| Facilities (create/edit) | — | ✓ | ✓ |
| **Support Tickets** | ✓ | ✓ | ✓ |

---

## 8. API Requirements

### 8.1 Existing Endpoints (already built)

| Method | Route | Usage |
|--------|-------|-------|
| `GET` | `/admin/users` | User list |
| `PATCH` | `/admin/users/:id/role` | Role change (super_admin) |
| `PATCH` | `/admin/users/:id/status` | Activate/deactivate |
| `GET` | `/admin/audit-logs` | Audit log table |
| `GET` | `/admin/facilities` | Facility list |
| `POST` | `/admin/facilities` | Create facility |
| `PATCH` | `/admin/facilities/:id` | Update facility |

### 8.2 New Endpoints Required

The following endpoints do not exist and must be built in the `health-hub-africa-api` admin module before the corresponding frontend screens can connect to real data.

**Analytics:**
| Method | Route | Response |
|--------|-------|----------|
| `GET` | `/admin/analytics/summary` | KPI totals: MRR, active users, subscription counts, open dispatches |
| `GET` | `/admin/analytics/revenue` | Revenue time series, broken down by tier and gateway. Query: `?from=&to=&interval=day\|week\|month` |
| `GET` | `/admin/analytics/usage` | Service usage counts by type. Query: `?from=&to=&interval=` |
| `GET` | `/admin/analytics/growth` | New registrations + DAU/MAU time series |

**Service Operations:**
| Method | Route | Response |
|--------|-------|----------|
| `GET` | `/admin/operations/appointments` | All appointments with patient + provider info. Paginated, filterable |
| `PATCH` | `/admin/operations/appointments/:id/status` | Update status (cancel, no-show) |
| `GET` | `/admin/operations/telecare` | All telecare sessions. Paginated, filterable |
| `GET` | `/admin/operations/expert-review` | All expert review cases. Paginated, filterable |
| `PATCH` | `/admin/operations/expert-review/:id/assign` | Assign coordinator |
| `PATCH` | `/admin/operations/expert-review/:id/status` | Update case status |
| `GET` | `/admin/operations/dispatch` | All dispatch requests with event timeline |
| `PATCH` | `/admin/operations/dispatch/:id/status` | Update dispatch status |
| `GET` | `/admin/operations/labs` | All lab orders with results. Flagged items first |

**System Health:**
| Method | Route | Response |
|--------|-------|----------|
| `GET` | `/admin/system/sync-queue` | OpenEMR sync queue items with stats |
| `POST` | `/admin/system/sync-queue/:id/retry` | Retry a failed sync job |
| `POST` | `/admin/system/sync-queue/:id/dismiss` | Acknowledge/dismiss a failed job |
| `GET` | `/admin/system/errors` | Integration error log. Paginated, filterable |
| `PATCH` | `/admin/system/errors/:id/resolve` | Mark error as resolved |
| `GET` | `/admin/system/health` | External service health check (OpenEMR, Paystack, LiveKit, Redis) |

**Support:**
| Method | Route | Response |
|--------|-------|----------|
| `GET` | `/admin/support` | Support tickets. Paginated, filterable by status |
| `GET` | `/admin/support/:id` | Single ticket with message thread |
| `PATCH` | `/admin/support/:id/status` | Update ticket status |
| `PATCH` | `/admin/support/:id/assign` | Assign ticket to staff member |
| `POST` | `/admin/support/:id/note` | Add internal note |

**Total new endpoints: 23**

---

## 9. Design Direction

### Visual Language

**Dark admin UI** — enterprise operations aesthetic. Reference: Linear, Vercel dashboard, Grafana.

| Element | Spec |
|---------|------|
| Sidebar | `#0B1A0D` (existing `--color-sidebar` in dark mode) |
| Page background | `#111811` |
| Card surfaces | `#1A251A` |
| Primary text | `#D0E8D0` |
| Muted text | `#8A9A8A` |
| Accent / interactive | `#6DC43F` (HHA lime green) |
| Danger / error | `#C0392B` |
| Warning | `#E8930A` |
| Success | `#6DC43F` |
| Font | Manrope (existing — display + body) |
| Monospace | JetBrains Mono (for IDs, error payloads) |

### Layout

```
┌─────────────┬──────────────────────────────────────────┐
│             │  [Breadcrumb]             [User] [Bell]  │
│   Sidebar   ├──────────────────────────────────────────┤
│   nav       │                                          │
│   items     │   Page Content                          │
│   (icons +  │   (KPI cards, data tables, charts)      │
│    labels)  │                                          │
│             │                                          │
└─────────────┴──────────────────────────────────────────┘
```

- Sidebar width: 240px expanded, 64px collapsed (icon-only)
- No right panel — admin is table-first, not card-first
- Table rows: 48px height, hover highlight
- Status pills: colored background (same `Pill` component, extended with admin-specific colors)

### Interaction Patterns

- **Inline status changes:** Dropdown on the table row, saves immediately with optimistic update
- **Bulk actions:** Checkbox column appears on hover; bulk action bar slides in from bottom when items selected
- **Detail panels:** Side panel slides in from right (not a separate page) for read-only detail; modal for write operations
- **Confirmation dialogs:** Destructive actions (deactivate user, close dispatch) require a confirmation modal with typed confirmation for super-admin irreversible actions

---

## 10. Directory Structure

The admin dashboard is a **standalone Next.js project** at `health-hub-africa-admin/`. The patient portal (`health-hub-africa/`) is not modified.

```
Health Hub Africa/
├── health-hub-africa/          ← Patient portal — UNCHANGED
├── health-hub-africa-api/      ← NestJS backend — UNCHANGED
├── myvaultplus-web/            ← Marketing site — UNCHANGED
│
└── health-hub-africa-admin/    ← NEW standalone admin app
    │
    ├── app/
    │   ├── layout.tsx                      # Root layout: <html class="dark">, fonts
    │   ├── globals.css                     # Copied from patient portal — all Tailwind v4 tokens
    │   ├── page.tsx                        # Redirects to /overview
    │   ├── login/
    │   │   └── page.tsx                    # Admin login screen
    │   ├── overview/
    │   │   └── page.tsx
    │   ├── users/
    │   │   ├── page.tsx
    │   │   └── [id]/
    │   │       └── page.tsx
    │   ├── analytics/
    │   │   └── page.tsx
    │   ├── operations/
    │   │   ├── appointments/page.tsx
    │   │   ├── telecare/page.tsx
    │   │   ├── expert-review/page.tsx
    │   │   ├── dispatch/page.tsx
    │   │   └── labs/page.tsx
    │   ├── system/
    │   │   ├── sync/page.tsx
    │   │   ├── errors/page.tsx
    │   │   └── audit-logs/page.tsx
    │   ├── facilities/
    │   │   └── page.tsx
    │   └── support/
    │       └── page.tsx
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AdminShell.tsx              # Dark sidebar + topbar wrapper
    │   │   ├── AdminSidebar.tsx            # Collapsible nav (240px / 64px)
    │   │   ├── AdminTopbar.tsx             # Breadcrumb, user avatar, bell
    │   │   └── AdminBreadcrumb.tsx
    │   │
    │   ├── screens/
    │   │   ├── OverviewScreen.tsx
    │   │   ├── UsersScreen.tsx
    │   │   ├── UserDetailScreen.tsx
    │   │   ├── AnalyticsScreen.tsx
    │   │   ├── AppointmentsScreen.tsx
    │   │   ├── TelecareScreen.tsx
    │   │   ├── ExpertReviewScreen.tsx
    │   │   ├── DispatchScreen.tsx
    │   │   ├── LabsScreen.tsx
    │   │   ├── SyncQueueScreen.tsx
    │   │   ├── ErrorsScreen.tsx
    │   │   ├── AuditLogsScreen.tsx
    │   │   ├── FacilitiesScreen.tsx
    │   │   └── SupportScreen.tsx
    │   │
    │   ├── tables/
    │   │   ├── DataTable.tsx               # Generic sortable, paginated table
    │   │   ├── UserTableRow.tsx
    │   │   ├── AppointmentTableRow.tsx
    │   │   └── ...
    │   │
    │   ├── panels/
    │   │   ├── UserDetailPanel.tsx
    │   │   ├── CaseDetailPanel.tsx
    │   │   └── DispatchTimelinePanel.tsx
    │   │
    │   ├── charts/
    │   │   ├── RevenueChart.tsx
    │   │   ├── UsageChart.tsx
    │   │   ├── GrowthChart.tsx
    │   │   └── SubscriptionDonut.tsx
    │   │
    │   ├── shared/
    │   │   ├── AdminKpiCard.tsx            # Extends KpiCard for admin metrics
    │   │   ├── StatusPill.tsx              # Extends Pill for admin statuses
    │   │   ├── HealthBadge.tsx             # Service health indicator dot
    │   │   ├── BulkActionBar.tsx           # Slides up from bottom on row selection
    │   │   └── ConfirmModal.tsx            # Destructive action confirmation
    │   │
    │   └── ui/                             # Copied from patient portal, then owned here
    │       ├── Button.tsx
    │       ├── Card.tsx
    │       ├── KpiCard.tsx
    │       ├── ListRow.tsx
    │       ├── Pill.tsx
    │       ├── Skeleton.tsx
    │       ├── FilterTabs.tsx
    │       ├── Avatar.tsx
    │       └── FormInput.tsx
    │
    ├── lib/
    │   ├── api.ts                          # Copied + trimmed from patient portal
    │   ├── utils.ts                        # cn() utility, copied
    │   ├── errorMessages.ts                # Copied from patient portal
    │   └── stores/
    │       ├── authStore.ts                # Copied from patient portal (Zustand)
    │       └── adminStore.ts               # NEW — sidebar state, filter state
    │
    ├── middleware.ts                       # Admin-specific role gate
    ├── next.config.ts                      # Security headers, Sentry
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

---

## 11. Non-Goals

The following are explicitly **out of scope** for this PRD:

- **Patient-facing features** — No changes to existing patient portal screens or flows
- **Provider portal** — Provider-specific dashboard is a separate product
- **Real-time video** — Admin cannot join or observe TeleCare sessions
- **Billing system** — Admin can view payment history but cannot issue refunds or change prices (Paystack/Flutterwave actions only)
- **Clinical editing** — Admin cannot edit clinical records, lab results, or FHIR data directly
- **Mobile app** — Admin dashboard is desktop/tablet-first; mobile is supported but not optimized
- **Custom report builder** — Analytics are pre-defined; no drag-and-drop report generation
- **Multi-tenancy** — This is a single-tenant HHA admin dashboard, not a white-label product

---

## 12. Open Questions

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| Q1 | Should coordinators see a filtered overview dashboard (only expert review + support KPIs) or the full overview with some cards hidden? | Product | High |
| Q2 | Does the analytics module need real-time data (WebSocket/SSE) or is polling every 60s acceptable? | Engineering | Medium |
| Q3 | What is the retention policy for audit logs? Should they be archivable/exportable to S3 after N days? | Compliance | High |
| Q4 | Should the system health check endpoint aggregate health from the backend, or should the frontend call each external service directly? | Engineering | Medium |
| Q5 | Is there a need to send notifications from the admin dashboard (e.g. notify patient via SMS from user detail)? | Product | Low |
| Q6 | What constitutes a "support ticket" — is there an existing `SupportMessage` schema or does it need to be designed? | Engineering | High |
| Q7 | Should admin actions (e.g. role change, user deactivation) trigger email notifications to the affected user? | Product | Medium |
