# Security Procedures — Health Hub Africa / MyHealth Vault+™

> This document is **mandatory reading** for every engineer who touches this codebase.
> It must be reviewed and signed off before any deployment to a production environment.

---

## 1. Security Principles

This is a healthcare application that stores PHI (Protected Health Information). Every decision must be made with the assumption that a breach is catastrophic — medical records, prescriptions, emergency dispatch data, and payment details belong to real patients.

**Non-negotiable rules:**

1. **PHI never leaves the server in plaintext** — no logging of health records, diagnoses, medications, or personal identifiers.
2. **Frontend never calls OpenEMR directly** — every clinical record goes through the HHA API middleware.
3. **Secrets never touch source code** — use AWS Secrets Manager + environment variables only.
4. **All external data is untrusted** — validate and sanitise everything at system boundaries.
5. **Principle of least privilege** — every user, service, and IAM role has only the permissions it needs.

---

## 2. Development Security Checklist

Before every pull request:

### Code Review
- [ ] No secrets, tokens, or credentials hardcoded anywhere
- [ ] All new API endpoints have JWT authentication (`@ApiBearerAuth()`)
- [ ] All new endpoints are covered by the global `ThrottlerGuard`
- [ ] All new DTOs have `@IsString() @MaxLength()` on free-text fields
- [ ] No `console.log` that might print request bodies, tokens, or PHI
- [ ] No `any` type on parameters that carry user/auth data
- [ ] No direct SQL — all DB access goes through Prisma ORM
- [ ] Password fields are never included in `select:` projections
- [ ] Error responses never include stack traces or internal path information
- [ ] New file upload paths validate MIME type, extension, and size server-side

### Before Merging
- [ ] Run `npm audit` — no critical or high vulnerabilities in dependencies
- [ ] All CI checks pass (build + tests)
- [ ] A second reviewer has approved the PR

---

## 3. Secrets Management

### Rules
- Secrets live in **AWS Secrets Manager** (production) and `.env` (local dev only)
- `.env` is in `.gitignore` — **never commit it**
- `.env.example` contains only placeholder values, never real secrets
- JWT secrets must be generated with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- Rotate secrets immediately if any are accidentally exposed in logs, commits, or Slack

### Required Secrets (backend)
| Variable | Purpose | Minimum length |
|----------|---------|----------------|
| `JWT_SECRET` | Access token signing | 64 bytes hex |
| `JWT_REFRESH_SECRET` | Refresh token signing | 64 bytes hex |
| `PAYSTACK_SECRET_KEY` | Payment processing | From Paystack dashboard |
| `FLUTTERWAVE_SECRET_KEY` | Payment processing | From Flutterwave dashboard |
| `OPENEMR_CLIENT_SECRET` | EMR integration | From OpenEMR admin panel |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | S3 file storage | IAM credentials |

### Secret Rotation Policy
- JWT secrets: rotate every **90 days**
- Payment gateway keys: rotate after **any suspected exposure**
- AWS IAM credentials: use **IAM Roles** for ECS tasks (not static keys in production)
- OpenEMR credentials: rotate every **180 days**

---

## 4. Authentication & Session Rules

- Access tokens expire in **15 minutes** (`JWT_EXPIRY=900`)
- Refresh tokens expire in **7 days** (`JWT_REFRESH_EXPIRY=604800`)
- Refresh token rotation is enforced: each use invalidates the old token
- Refresh tokens are stored in the database and can be revoked by user or admin
- On password change: all active sessions are revoked
- On password reset: all active sessions are revoked
- Users can view and revoke all their active sessions via `GET /api/v1/auth/sessions`

---

## 5. Rate Limiting Policy

| Endpoint group | Limit | Window |
|----------------|-------|--------|
| Global API | 100 req | 60s |
| `POST /auth/login` | 10 req | 60s |
| `POST /auth/register` | 5 req | 60s |
| `POST /auth/verify-otp` | 5 req | 60s |
| `POST /auth/request-otp` | 3 req | 60s |
| `POST /auth/forgot-password` | 3 req | 60s |
| `POST /auth/reset-password` | 5 req | 60s |
| Payment webhooks | No limit (IP allowlisted) | — |

Rate limits are enforced per-IP using `ThrottlerGuard` backed by Redis.

---

## 6. Input Validation Rules

All input validation goes in DTOs using `class-validator`. Every DTO must:

- Have `@IsString() @MaxLength(N)` on every free-text field (prevent DoS)
- Have `@IsEmail()` on email fields
- Have `@Matches(/regex/)` for formatted fields (phone, IDs)
- Enforce `@Min() / @Max()` on numeric amounts
- Use `@IsEnum()` for fields with fixed value sets

The global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` strips unknown fields. Never disable these options.

---

## 7. CORS Policy

CORS is configured to accept requests only from `FRONTEND_URL`. In production this must be the exact Vercel domain (e.g., `https://healthhubafrica.com`). **Never set CORS to `*`.**

If additional origins are needed (preview deployments, mobile apps), they must be listed explicitly via environment variable — not by disabling CORS validation.

---

## 8. File Upload Security

All file uploads go through a two-step pre-signed URL pattern:
1. Client requests a pre-signed PUT URL from `POST /api/v1/records/upload-url`
2. Server validates: MIME type allowlist, size ≤ 50 MB, filename sanitised
3. Client uploads directly to S3 using the signed URL
4. No executable file types are permitted under any circumstances

Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `application/dicom`

S3 bucket must have **public access blocked** — files are only accessible via time-limited signed GET URLs (5 minutes).

---

## 9. Payment Webhook Security

- Paystack webhooks: verified with `HMAC-SHA512` using `timingSafeEqual`
- Flutterwave webhooks: verified with `HMAC-SHA256` using `timingSafeEqual`
- Webhook endpoints are `@Public()` (no JWT required) but **should be IP-restricted at the AWS WAF/ALB layer**
- Idempotency check prevents double-processing the same event
- Raw body (`rawBody: true`) is used for signature computation — never parse before verifying

**AWS WAF rules to add:**
- Allow `POST /api/v1/payments/webhooks/paystack` only from Paystack IP ranges
- Allow `POST /api/v1/payments/webhooks/flutterwave` only from Flutterwave IP ranges
- Block all other sources from these endpoints

---

## 10. PHI & Data Protection

- `passwordHash`, `refreshToken`, `token` fields are stripped from all audit log metadata by `AuditLogInterceptor`
- `select:` projections on Prisma queries **never** include `passwordHash`
- Clinical records, lab results, and prescriptions require ownership verification before access
- Confidential records (`isConfidential: true`) require `provider` or `admin` role
- Error messages never include DB query details, stack traces, or object IDs that could aid enumeration

---

## 11. AWS Infrastructure Security Rules

- ECS tasks must use **IAM Task Roles**, not static `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in production
- S3 bucket: `BlockPublicAcls`, `BlockPublicPolicy`, `IgnorePublicAcls`, `RestrictPublicBuckets` — all `true`
- RDS: encryption at rest enabled, private subnet only, no public endpoint
- Redis (ElastiCache): private subnet only, `AUTH` token required
- ALB: HTTPS only, redirect HTTP → HTTPS, minimum TLS 1.2
- WAF: IP allowlist for payment webhooks, rate limiting rule, SQL injection protection
- VPC: OpenEMR in private subnet, SG allows port 443 only from HHA API SG
- Secrets Manager: all production secrets stored here, not in ECS task definition environment variables directly

---

## 12. Dependency Security

- Run `npm audit` in both `health-hub-africa/` and `health-hub-africa-api/` **weekly**
- Use Dependabot or Snyk to automate vulnerability alerts
- Patch `critical` and `high` vulnerabilities within **48 hours**
- Patch `moderate` vulnerabilities within **2 weeks**
- Never ignore audit warnings without documented justification

---

## 13. Incident Response

If a security incident is suspected:

1. **Immediately revoke** all JWT sessions: `POST /api/v1/auth/logout-all`
2. **Rotate** all secrets in AWS Secrets Manager
3. **Redeploy** the API to pick up new secrets
4. **Preserve** CloudWatch logs and ALB access logs — do not delete
5. **Notify** affected patients within 72 hours (NDPR / GDPR requirement)
6. **Document** the incident in a post-mortem

---

## 14. Security Review Cadence

| Activity | Frequency |
|----------|-----------|
| Dependency audit (`npm audit`) | Weekly (automated in CI) |
| Code security review of auth/payments changes | Every PR |
| Full penetration test | Before major releases |
| AWS IAM permissions review | Quarterly |
| Secret rotation | See §3 above |
| SECURITY.md review | Every 6 months |
