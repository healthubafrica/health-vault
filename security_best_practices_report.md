# Security Audit Report — Health Hub Africa / MyHealth Vault+™

**Date:** 2026-06-02  
**Scope:** Full-stack (NestJS API + Next.js frontend)  
**Deployment:** Vercel (frontend) + AWS ECS (backend)

---

## Executive Summary

The codebase has a solid security foundation: HMAC-verified payment webhooks, bcrypt-12 password hashing, token rotation, audit logging, global rate limiting, and Helmet security headers are all correctly implemented. However, **7 vulnerabilities require immediate remediation** before this application handles real PHI or payment data. The most critical is a privilege escalation bug that allows any user to self-register as an administrator. A token storage misconfiguration also causes a broken authentication flow between the middleware and the API client.

---

## CRITICAL Findings

### SEC-001 — Privilege Escalation via Role Self-Assignment

**Impact: Any anonymous user can register as `admin` or `super_admin`, gaining full access to all patient data.**

**File:** `health-hub-africa-api/src/auth/dto/register.dto.ts` line 30–33  
**File:** `health-hub-africa-api/src/auth/auth.service.ts` line 47

The `RegisterDto` exposes a `role?: UserRole` field that maps directly to `UserRole` enum including `admin` and `super_admin`. Any client can POST `{ "email": "x@x.com", "password": "...", "role": "super_admin" }` to create an admin account with no restrictions.

```typescript
// VULNERABLE — register.dto.ts line 30
@ApiPropertyOptional({ enum: UserRole, default: UserRole.patient })
@IsOptional()
@IsEnum(UserRole)
role?: UserRole;

// VULNERABLE — auth.service.ts line 47
role: dto.role ?? UserRole.patient,  // accepts any role from client
```

**Fix:** Remove the `role` field from `RegisterDto`. Admin roles must only be assigned by an existing admin via a separate, protected endpoint.

---

### SEC-002 — Broken Authentication Flow (Middleware / API Client Mismatch)

**Impact: All protected routes return a redirect loop. The middleware is effectively bypassed for authenticated users.**

**File:** `health-hub-africa/middleware.ts` line 15  
**File:** `health-hub-africa/lib/api.ts` line 10, 18

The middleware checks `request.cookies.get('hha_access_token')` for authentication, but the API client stores tokens in `localStorage` and never writes to cookies. Every authenticated user will be redirected to `/login` on every page load because the cookie is never set.

Additionally, `localStorage` is accessible to any JavaScript on the page — a successful XSS attack would allow complete token theft and session hijacking.

**Fix:** On login, write the access token to a `secure; samesite=strict` cookie. The refresh token should be `httpOnly` to prevent JS access. The middleware should then correctly read the cookie.

---

### SEC-003 — Weak Password Policy (Healthcare Application)

**Impact: Users can register with passwords like `password1` that are easily brute-forced, putting PHI at risk.**

**File:** `health-hub-africa-api/src/auth/dto/register.dto.ts` line 24–27  
**File:** `health-hub-africa-api/src/auth/dto/account-settings.dto.ts` line 7–12  
**File:** `health-hub-africa-api/src/auth/dto/verify-otp.dto.ts` line 29–33

Password validation only enforces `@MinLength(8)` with no complexity requirements. This is insufficient for a healthcare application holding PHI.

**Fix:** Add regex validators requiring uppercase, lowercase, digit, and special character. Minimum length should be raised to 12.

---

### SEC-004 — Missing Trust Proxy Configuration (Rate Limiting Bypass)

**Impact: Behind the AWS ALB, `req.ip` is always the internal load balancer IP. All users share the same rate limit bucket — one user can exhaust limits for everyone, or rate limiting provides no per-user protection.**

**File:** `health-hub-africa-api/src/main.ts`

Express is not configured to trust the `X-Forwarded-For` header set by the ALB. All `req.ip` values will be the internal ALB IP, making per-IP rate limiting useless and IP audit logging inaccurate.

**Fix:** Add `app.set('trust proxy', 1)` in `main.ts` to trust the first proxy hop (the ALB).

---

### SEC-005 — Missing Rate Limit on OTP Verification and Password Reset

**Impact: An attacker can brute-force a 6-digit OTP (1,000,000 combinations) within the 10-minute window if verification requests are not throttled.**

**File:** `health-hub-africa-api/src/auth/auth.controller.ts` line 81–86 (`verify-otp`)  
**File:** `health-hub-africa-api/src/auth/auth.controller.ts` line 107–112 (`reset-password`)

`POST /auth/verify-otp` and `POST /auth/reset-password` have no `@Throttle()` decorator. At 100 req/min (global limit), an attacker could try all 1,000,000 OTP combinations in under 170 minutes.

**Fix:** Add strict rate limits — 5 attempts per 60 seconds per IP — to both endpoints.

---

### SEC-006 — Broken Object Level Authorization on Clinical Records

**Impact: Any authenticated provider can read any patient's records, including patients not assigned to them.**

**File:** `health-hub-africa-api/src/records/records.service.ts` line 227–238

`assertReadAccess` grants read access to any user with role `provider`, regardless of whether they have an assignment relationship with the patient. A provider at one clinic can read records from a patient at a different clinic.

```typescript
// VULNERABLE — records.service.ts line 231
const isProvider = [UserRole.provider].includes(currentUser.role as UserRole);
if (!isAdmin && !isOwner && !isProvider) {  // any provider passes
  throw new ForbiddenException('Access denied');
}
```

**Fix:** For providers, verify the `PatientProviderAssignment` table confirms an active assignment to the patient before granting access.

---

### SEC-007 — URL Path Exposed in Error Responses

**Impact: Error responses include `path: request.url`, leaking full URL paths including query parameters that could contain tokens, patient IDs, or other sensitive data.**

**File:** `health-hub-africa-api/src/common/filters/http-exception.filter.ts` line 43

```typescript
// VULNERABLE — http-exception.filter.ts line 43
path: request.url,  // e.g. /api/v1/patients/abc-uuid?token=xxx
```

**Fix:** Remove the `path` field from all error responses, or replace it with only the route pattern (never the full URL with query parameters).

---

## HIGH Findings

### SEC-008 — S3 Object Key Path Traversal Risk

**File:** `health-hub-africa-api/src/records/records.service.ts` line 44

```typescript
const ext = dto.filename.split('.').pop() ?? 'bin';
const objectKey = `records/${currentUser.sub}/${randomUUID()}.${ext}`;
```

A malicious filename like `malware.php` would produce key `records/uuid/uuid.php`. While S3 doesn't execute files, this could confuse downstream processors and CDN Content-Type inference.

**Fix:** Allowlist extensions to the permitted MIME type set and strip all non-alphanumeric characters.

---

### SEC-009 — No MaxLength on Free-Text DTO Fields

**File:** `health-hub-africa-api/src/auth/dto/register.dto.ts`, `verify-otp.dto.ts`, `account-settings.dto.ts`

Password and email fields lack `@MaxLength()` constraints. Very long inputs could cause bcrypt to behave unexpectedly (bcrypt truncates at 72 bytes silently) and could trigger DoS via large body parsing.

**Fix:** Add `@MaxLength(72)` to password fields (bcrypt limit), `@MaxLength(254)` to email fields, `@MaxLength(255)` to all other free-text strings.

---

### SEC-010 — Any String Accepted as `role` in DTO Type

**File:** `health-hub-africa-api/src/auth/auth.controller.ts` line 60, 68

```typescript
logout(@CurrentUser() user: any)   // line 68
refresh(@CurrentUser() user: any)  // line 60
```

Using `any` bypasses TypeScript's type safety on user-carrying parameters. A refactor that changes the payload shape could silently break security checks.

**Fix:** Replace `any` with the concrete `JwtPayload` type.

---

### SEC-011 — Webhook Endpoints Bypass Rate Limiting Without IP Restriction

**File:** `health-hub-africa-api/src/payments/payments.controller.ts` line 47–48, 59–60

`@SkipThrottle()` is correct for legitimate webhook traffic, but without AWS WAF IP allowlisting these endpoints accept unlimited unauthenticated requests from any source. HMAC verification protects from *forged* webhooks but not from a DoS flood.

**Fix:** Apply AWS WAF rules to restrict these paths to Paystack and Flutterwave IP ranges.

---

## MEDIUM Findings

### SEC-012 — `X-Forwarded-For` Not Normalised in Audit Log

**File:** `health-hub-africa-api/src/common/interceptors/audit-log.interceptor.ts` line 37

```typescript
const ipAddress = req.ip ?? req.headers['x-forwarded-for'];
```

`x-forwarded-for` can contain a comma-separated list (multiple proxy hops). The raw header is stored, potentially logging `"10.0.0.1, 203.0.113.1"` instead of the real client IP.

**Fix:** Parse and use only the first IP from the header after trust proxy is configured (trust proxy makes `req.ip` correct automatically).

---

### SEC-013 — OTP Stored as Plaintext in Database

**File:** `health-hub-africa-api/src/auth/auth.service.ts` line 349

OTPs are stored as the raw 6-digit string in `verification_tokens.token`. If the database is compromised, an attacker can harvest unused OTPs.

**Fix:** Store a bcrypt hash of the OTP. On verification, compare with `bcrypt.compare()`. This is lower priority than SEC-001–007 but is best practice for healthcare applications.

---

### SEC-014 — Frontend Token Storage in localStorage

**File:** `health-hub-africa/lib/api.ts` line 10, 18

Access tokens in `localStorage` are readable by any JavaScript on the page. While the CSP helps, a single XSS vulnerability would expose all tokens.

**Recommended fix (see SEC-002 fix):** Store the access token in a `secure; samesite=strict` cookie. The httpOnly flag can be used for the refresh token since it only needs to be sent to `/auth/refresh`, not read by JS.

---

## LOW Findings

### SEC-015 — Swagger Docs Accessible Without Authentication in Development

**File:** `health-hub-africa-api/src/main.ts` line 63–75

Swagger is disabled in production (`!isProd` guard). This is correct. No action needed.

### SEC-016 — `req.rawBody!` Non-null Assertion

**File:** `health-hub-africa-api/src/payments/payments.controller.ts` line 56, 68

Using `!` asserts rawBody is always present. It will be, since `rawBody: true` is set in `main.ts`. Low risk — no change needed beyond awareness.

---

## Summary Table

| ID | Severity | Title | File | Fixed |
|----|----------|-------|------|-------|
| SEC-001 | 🔴 CRITICAL | Role self-assignment in registration | register.dto.ts:30 | ✅ |
| SEC-002 | 🔴 CRITICAL | Auth middleware/API client mismatch | middleware.ts:15, api.ts:18 | ✅ |
| SEC-003 | 🔴 CRITICAL | Weak password policy | register.dto.ts:24 | ✅ |
| SEC-004 | 🔴 CRITICAL | No trust proxy — rate limiting bypass | main.ts | ✅ |
| SEC-005 | 🔴 CRITICAL | OTP/reset-password not rate-limited | auth.controller.ts:81, 107 | ✅ |
| SEC-006 | 🔴 CRITICAL | BOLA — any provider reads any patient record | records.service.ts:231 | ✅ |
| SEC-007 | 🔴 CRITICAL | URL path in error responses | http-exception.filter.ts:43 | ✅ |
| SEC-008 | 🟠 HIGH | S3 key extension not allowlisted | records.service.ts:44 | ✅ |
| SEC-009 | 🟠 HIGH | No MaxLength on password/email DTOs | register.dto.ts, account-settings.dto.ts | ✅ |
| SEC-010 | 🟠 HIGH | `any` type on auth controller params | auth.controller.ts:60, 68 | ✅ |
| SEC-011 | 🟠 HIGH | Webhooks not IP-restricted | payments.controller.ts:48 | Documented (WAF) |
| SEC-012 | 🟡 MEDIUM | x-forwarded-for not normalised | audit-log.interceptor.ts:37 | ✅ |
| SEC-013 | 🟡 MEDIUM | OTP stored plaintext | auth.service.ts:349 | ✅ |
| SEC-014 | 🟡 MEDIUM | Tokens in localStorage (XSS risk) | api.ts:10, 18 | ✅ (via SEC-002 fix) |
