# AWS Resource Audit — Follow-up (2026-08-04)

**Account:** 940482422128 (IAM user `omotosho`) · **Profile:** `hha` (new dedicated CLI profile, see below)
**Scope:** All regions with non-zero spend (`af-south-1`, `us-east-1`, `us-east-2`, `sa-east-1`) + Cost Explorer.
**Relationship to prior audit:** [AWS-RESOURCE-AUDIT.md](./AWS-RESOURCE-AUDIT.md) (2026-07-13) was scoped to `af-south-1` only. Its 9 cleanup items are gone from today's enumeration — that cleanup evidently happened around 2026-07-14 (a manual RDS snapshot and an EBS snapshot from that date, both named/described as pre-cleanup archives, confirm this). This doc covers what that pass couldn't see (other regions) plus drift since then.
**Status: audit only — nothing below has been executed.**

---

## Setup: `hha` CLI profile

`~/.aws/config` and `~/.aws/credentials` had `default` (happens to already be this account) and `clara-ai` (a **different, unrelated account**, 564290535188). Added a dedicated `hha` profile with the same credentials as `default`, so future work can target `--profile hha` explicitly without relying on whatever `default` happens to be. `default`/`clara-ai` untouched.

---

## July spend: $621.99 total

| Service | Cost | |
|---|---|---|
| RDS | $259.58 | **42% of total** — MultiAZ db.t4g.medium |
| AWS Support (Business) | $72.18 (Jul, prorated) → $100 flat (Aug) | |
| EC2 - Other | $97.86 | EBS storage + a NAT Gateway charge that predates the fck-nat migration |
| EC2 Compute | $55.08 | `hha-openemr-prod` + `hha-fck-nat` |
| ECS (Fargate) | $47.99 | API service |
| ElastiCache | $22.42 | Redis, 1 node |
| ELB | $22.35 | ALB |
| VPC | $22.97 | |
| CloudWatch | $18.60 | Sane retention on all log groups |
| KMS / Secrets Manager / ECR / S3 | ~$3 | Negligible |

**By region:** `af-south-1` $516.17 (the real production stack) vs. **$33.65/month across `sa-east-1`, `us-east-1`, `us-east-2`** — resources with no connection to this project.

---

## Decisions made (2026-08-04) — not yet executed

| # | Resource | Region | Decision | Notes |
|---|---|---|---|---|
| 1 | `OpenEMR-Prod` (t3.xlarge, stopped) + `EMR-DEV` (t2.medium, stopped) + 2 unattached 50GB EBS volumes | us-east-1 | **Terminate** | Pre-migration OpenEMR stack (launched Dec 2025 / Feb 2026), superseded by `hha-openemr-prod` in af-south-1 (June 2026). ~$12.60/mo. |
| 2 | Unnamed t3.micro, stopped since Jan 2025, no tags | us-east-2 | **Terminate** | 18+ months stopped, no identifying tags. ~$2.40/mo. |
| 3 | `debian` (t3.micro, **running**) + `deb 12` (t2.medium, stopped) | sa-east-1 | **Terminate both** | No connection to this project found. ~$18.65/mo, includes an actively-running instance. |
| 4 | S3 `hha-db-archive` | af-south-1 | **Delete if not needed** | One-time DB export from 2026-07-14, no activity since. Negligible size. |
| 5 | RDS manual snapshot `hha-postgres-pre-rightsize-20260714` | af-south-1 | **Delete if not needed** | Safety snapshot from a resize that already succeeded weeks ago. |
| 6 | EBS snapshot "Archive: unattached 20GB volume before deletion (2026-07-14)" | af-south-1 | **Delete if not needed** | Same 2026-07-14 cleanup; purpose already served. |

**Total identified savings once executed: ~$33.65/month** (cross-region) + negligible storage from items 4–6.

⚠️ **Before executing #1**: confirm the pre-migration OpenEMR clinical data was fully migrated to the current af-south-1 instance — this may be the only remaining copy if not. Recommend a read-only check (mount/snapshot-inspect the volumes, no deletion) before terminating, even though the call has been made to proceed.

---

## Open decisions (not yet made — recommendation given, awaiting call)

| Item | Current state | Recommendation | Est. impact |
|---|---|---|---|
| RDS MultiAZ | `hha-postgres` db.t4g.medium, MultiAZ | Review whether HA is needed at current scale; single-AZ roughly halves this line | ~$130/mo if downgraded |
| AWS Support tier | Business ($100/mo flat) | Check if Developer tier covers actual support needs | Up to ~$95/mo if downgraded |
| ECR lifecycle policy (bug, not a decision — just needs fixing) | Policy expires tags matching prefix `v`/`sha`; every image is tagged with a bare 40-char commit SHA, so **nothing has ever matched** — 109+ images, ~11GB+, accumulating forever | Fix the tag-match rule (drop `tagPrefixList` or match `tagStatus: any`) | Stops ongoing growth; one-line policy change |

---

## Confirmed in active use (af-south-1) — no changes

EC2 `hha-openemr-prod` + `hha-fck-nat` (self-managed NAT, already avoiding the AWS NAT Gateway fee) · RDS `hha-postgres` · ECS Fargate `hha-api-service` · ElastiCache `hha-redis-cluster-001` · ALB `hha-main-alb` (both target groups healthy) · S3 `hha-documents` · ECR `hha-api-repo` · 2 Secrets Manager secrets (both accessed within 2 weeks) · free S3 VPC gateway endpoint · all 3 Elastic IPs (1 NAT, 2 ALB cross-AZ interfaces) · 8 automated RDS daily snapshots (normal backup retention).
