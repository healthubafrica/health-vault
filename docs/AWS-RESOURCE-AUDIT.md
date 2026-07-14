# AWS Resource Audit — Health Hub Africa

**Date:** 2026-07-13 · **Account:** 940482422128 · **Region:** af-south-1 (Cape Town)
Method: read-only CLI enumeration of EC2/EBS/EIP, VPC/NAT, ECS/ECR, RDS (+snapshots), ElastiCache, ALB, S3, Lambda, SQS/SNS, CloudWatch (logs + alarms), Secrets Manager, Route 53, CloudFront — cross-checked against what the codebase and CI actually wire up.

---

## ✅ In use (keep)

| Resource | Identifier | Purpose |
| --- | --- | --- |
| ECS Fargate | `hha-cluster` / `hha-api-service` (1/1 running) | NestJS API (api.myvaultplus.com), deployed by GitHub Actions |
| ECR | `hha-api-repo` | API container images |
| RDS PostgreSQL | `hha-postgres` (db.m5d.large, Multi-AZ, 20 GB) | Production HHA database |
| RDS automated snapshots | `rds:hha-postgres-*` (7-day window) | Backup retention — normal |
| ElastiCache Redis | `hha-redis-cluster-001` (cache.t3.small) | Bull queues (OpenEMR sync), OAuth token store, feature-flag cache |
| EC2 | `i-00acc8c4d004c4fc9` — **hha-openemr-prod** (t3.medium, running) | OpenEMR 8.0 + MariaDB in Docker (clinical.myvaultplus.com); also the SSM bastion for DB tunnels |
| ALB | `hha-main-alb` (internet-facing) | Routes to `hha-api-tg` (ECS, healthy) and `hha-openemr-tg` (OpenEMR box, healthy) |
| NAT Gateway | `nat-1ba63dd2381a4f811` (in app VPC `vpc-0770a578eb5617fd2`, EIP 15.240.109.56) | Egress for private ECS tasks (OpenEMR calls, gateways, email) |
| S3 | `hha-documents` (11 objects, ~16 MB) | Patient records / vault uploads / profile photos (`S3_BUCKET`) |
| Secrets Manager | `hha/production-env`, `hha/openemr-refresh-token` | Both accessed daily (API boot + OpenEMR OAuth) |
| SNS | 5 topics (Fargate CPU/OOM, RDS storage, Redis CPU, ALB unhealthy) | Alarm notification targets |
| CloudWatch alarms | 5 alarms wired to the SNS topics | All in OK/monitoring state |
| CloudWatch logs | `/ecs/hha-api-task` (30d), `/aws/rds/instance/hha-postgres/postgresql` (7d), `/vpc/hha-production-flow-logs`, `RDSOSMetrics` (30d) | Active log streams |
| VPC | `vpc-0770a578eb5617fd2` (10.0.0.0/16) | Production network (ECS, RDS, Redis, OpenEMR box, ALB) |
| EIPs (in use) | 15.240.109.56 (NAT), 13.245.105.82 + 13.247.156.232 (ALB ENIs), 13.245.25.212 + 13.246.128.48 (RDS ENIs) | Attached and serving |

Not present at all (nothing to pay for): Lambda, SQS, Route 53 hosted zones, CloudFront — DNS and frontends live on Vercel.

---

## ❌ Not in use (cleanup candidates)

| # | Resource | Evidence it's unused | Est. cost/mo* | Recommended action |
| --- | --- | --- | --- | --- |
| 1 | EC2 `i-029eda0a63e2d7316` — **HHA-OpenEMR-Production** (t3.medium, **stopped** since ~Jun 15 cutover) | Superseded by `hha-openemr-prod`; stopped ~4 weeks | ~$17 (its 150 GB gp3 volume keeps billing while stopped) | Confirm nothing on it is still needed → snapshot the volume if you want an archive, then terminate |
| 2 | RDS manual snapshot `hha-openemr-db-snapshot` (**400 GB**, 2026-06-10) | Archive of the deleted `hha-openemr-db` RDS instance (OpenEMR now runs MariaDB in Docker) | ~$38 | Biggest single line item. If the Jun-10 OpenEMR data is already migrated/exported, delete; otherwise export to S3 Glacier (~$1.6/mo) and delete |
| 3 | NAT Gateway `nat-1b6c945f61d24be8c` (in **default** VPC `vpc-0bcb06beee662d79c`, EIP 15.240.90.170) | Default VPC contains only the stopped instance #1 | ~$47 + data | Verify no route tables in active use point at it → delete (its EIP releases with it) |
| 4 | Unassociated Elastic IP — 13.247.44.2 | Not attached to anything | ~$3.6 | Release. **Correction (2026-07-14):** 15.240.88.204, originally listed here, is actually the live app-VPC NAT gateway's second (af-south-1b) address — in use, keep |
| 5 | Unattached EBS volume `vol-03860b7e99a06293e` (20 GB, available) | Attached to nothing | ~$2 | Snapshot if unsure of contents, then delete |
| 6 | S3 `hha-temp-logo` | 0 objects | ~$0 | Delete bucket |
| 7 | S3 `openemr-2546da60-…` and `openemr-33c5bca0-…` | One empty CloudTrail folder each (Apr 29) — leftovers from earlier OpenEMR marketplace/CloudFormation installs | ~$0 | Delete both buckets |
| 8 | ALB target groups `SA-HHA-Target-Group` and `openemr` | Zero registered targets (the live TGs are `hha-api-tg` and `hha-openemr-tg`) | $0 | Delete (config hygiene) |
| 9 | Log group `/aws/rds/instance/hha-openemr-db/postgresql` | Its RDS instance no longer exists; retention = Never expire | ~$0 | Delete |

\* Approximate af-south-1 pricing; NAT and snapshot figures dominate.

**Potential savings: roughly $110/month** (≈ $1,300/year), mostly from items 1–4.

---

## ⚠️ Flags (not "unused", but found during the audit)

1. **`hha-postgres` has `PubliclyAccessible = true` and public EIPs on its network interfaces.** The team's own runbook (docs/.claude/rules/deployment.md) describes this DB as private-VPC-only, and day-to-day access goes through the SSM tunnel. Security groups are evidently blocking direct access (direct psql fails), but a publicly-addressable healthcare database is one security-group mistake away from exposure. Recommend flipping `PubliclyAccessible` to false (brief connectivity blip on modify) — nothing in the current workflow needs it public.
2. **`/vpc/hha-production-flow-logs` and the old OpenEMR log group have no retention policy** (Never expire). Set 30–90 days to cap growth.
3. **RDS is db.m5d.large Multi-AZ with 20 GB allocated** — generous for the current dataset (~13 patients). Not urgent, but a right-size review (e.g. db.t4g.medium Multi-AZ) could cut the largest recurring bill when growth assumptions are clearer.
4. GitHub Actions workflows "Frontend/Admin — Build & Deploy (Vercel)" fail on every run (empty `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` secrets); Vercel's Git integration does the real deploys. Fill the secrets or delete the workflows to stop the noise. (CI, not AWS spend.)

## Recommended cost-effective configuration

Full step-by-step procedures live in **[AWS-COST-OPTIMIZATION-RUNBOOK.md](./AWS-COST-OPTIMIZATION-RUNBOOK.md)**. Summary:

| Phase | Change | Saves/mo |
| --- | --- | --- |
| 1 | Cleanup (this doc's table above) | ~$110 |
| 2 | RDS → db.t4g.medium Multi-AZ (+ `PubliclyAccessible=false`), Redis → cache.t4g.micro, Fargate → ARM64 | ~$330–400 |
| 3 | NAT gateway → fck-nat t4g.nano + free S3 gateway endpoint | ~$45 |
| 4 | 1-yr no-upfront RDS RI + Compute Savings Plan (after 30 days stable) | ~30% of remainder |

Target: **~$700–800/mo → ~$260/mo (→ ~$200 with commitments)** with the same architecture — Multi-AZ DB, Redis, ALB, OpenEMR box, and all monitoring retained.

## Suggested cleanup order

1. Release the two idle EIPs and delete the empty buckets/target groups/old log group (zero risk).
2. Snapshot-then-terminate the stopped OpenEMR instance and delete its leftover volume.
3. Decide archive strategy for the 400 GB OpenEMR snapshot (export → Glacier, or delete if migrated).
4. Verify and delete the default-VPC NAT gateway.
5. Schedule the `PubliclyAccessible=false` change for the RDS instance in a maintenance window.
