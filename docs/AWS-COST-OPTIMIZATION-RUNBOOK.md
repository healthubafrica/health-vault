# AWS Cost Optimization Runbook — Health Hub Africa

**Account:** 940482422128 · **Region:** af-south-1 · **Companion doc:** [AWS-RESOURCE-AUDIT.md](./AWS-RESOURCE-AUDIT.md)
**Target:** ~$700–800/mo → ~$220–260/mo without removing any in-use capability.

**Ground rules**
- Run everything with the same profile/role used for the audit (`aws sts get-caller-identity` should show account 940482422128).
- Nothing destructive without a snapshot first. Every step lists its verify + rollback.
- Phases are ordered safest-first. Stop at any failed verify.

```powershell
# Session setup (PowerShell)
$env:AWS_DEFAULT_REGION = "af-south-1"
aws sts get-caller-identity
```

---

## Execution status — 2026-07-14

### ✅ Done (executed and verified)

| Phase | What | Realized saving/mo |
| --- | --- | --- |
| 1 | Cleanup: idle EIP released, 3 dead buckets, 2 orphan target groups, dead log group + retention, old instance/volume archived+removed, default-VPC NAT deleted, 400 GB "OpenEMR" snapshot verified empty (one 8 KB `_prisma_migrations` table on Postgres — never held OpenEMR data) and deleted | ~$110 |
| 2 | RDS `db.m5d.large` → **`db.t4g.medium`** Multi-AZ + **`PubliclyAccessible=false`** (pre-change snapshot `hha-postgres-pre-rightsize-20260714` retained); Redis → **`cache.t4g.micro`** via `modify-replication-group` (data survived); verified via tunnel psql, in-VPC `/health` 200, clean boot logs, all alarms OK | ~$305–375 |
| 2.4 | Fargate → **ARM64/Graviton** (PR #30, task def `:93`), shipped through the normal pipeline | ~$5–8 |
| 3 | Managed NAT → **fck-nat** `i-076309f91635cff74` (t4g.nano, EIP **15.240.45.130**); egress verified (ECS redeploy + OpenEMR pull cycles clean) before NAT deletion; free **S3 gateway endpoint** `vpce-032a54ca7b006ff80`; auto-recover + auto-reboot alarms on the instance | ~$43 net |
| — | Side effect of Phase 2: RDS's two public EIPs auto-released when the instance went private | — |

**Total realized: ~$465–535/mo (~$5,600–6,400/yr).** Expected steady-state bill: **~$200–250/mo** before Phase 4 commitments.

### ⏳ To be done later

| When | Item | Owner |
| --- | --- | --- |
| +24–48 h (by 2026-07-16) | Check RDS `CPUCreditBalance` trend — the only signal t4g.medium is undersized is a steadily draining credit balance. Also spot-check fck-nat (`NetworkOut`, status checks, one OpenEMR pull cycle in logs) | Claude/ops |
| Anytime | Create a **Billing budget alert** at ~$350/mo so cost drift gets flagged | Admin (console) |
| Anytime | Fix or delete the two dead GitHub-Actions Vercel workflows (empty `VERCEL_TOKEN`/`ORG_ID`/`PROJECT_ID` secrets fail every run; Vercel's Git integration does the real deploys) | Admin |
| ~2026-08-14 (after 30 stable days) | **Phase 4 commitments** (below): 1-yr no-upfront RDS RI for `db.t4g.medium` Multi-AZ + Compute Savings Plan sized from 30-day Cost Explorer data. Takes steady state to ~**$200/mo** | Admin purchases; Claude preps exact specs |
| When email/payment-gateway vendors ask | Outbound IP for whitelisting is now **15.240.45.130** (fck-nat EIP) | — |

---

## Scaling playbook — what to change as patient volume grows

The optimized stack is sized for the current load (tens of patients) with comfortable headroom into the **low thousands**. Everything scales by *instance-class modify*, not redesign. Watch the signals; apply the step next to them.

| Component | Now | Scale signal (CloudWatch) | Next step |
| --- | --- | --- | --- |
| RDS | db.t4g.medium Multi-AZ, 20 GB | `CPUCreditBalance` trending to 0, or CPU > 60% sustained, or `FreeableMemory` < 500 MB | `db.m7g.large` Multi-AZ (fixed-performance Graviton). Also **enable storage autoscaling now** (max 100 GB) — it's free until used |
| Redis | cache.t4g.micro | `DatabaseMemoryUsagePercentage` > 70% or `Evictions` > 0 | cache.t4g.small → t4g.medium. Queue/cache workload stays tiny until well past 10k patients |
| API (Fargate) | 1 × 1 vCPU/3 GB ARM64 task | CPU > 70% sustained or p95 latency rising | Add **service auto-scaling** (target-tracking CPU 70%, min 1 / max 4). The ALB is already in place — scale-out is a setting, not a project |
| fck-nat | t4g.nano, single AZ (af-south-1a) | Instance `NetworkOut` approaching ~0.5 Gbps sustained, or ops discomfort with self-managed NAT | t4g.small/medium first (still ≪ managed NAT cost). At real scale or compliance pressure, go back to a managed NAT gateway per AZ — the $47+/mo becomes noise once revenue exists |
| OpenEMR EC2 | t3.medium + MariaDB in Docker | CPU credits draining, clinic staff count growing | t3.large is a stop-gap; the real move at scale is MariaDB off the box into **RDS MariaDB Multi-AZ** so the EMR host is stateless and replaceable |
| S3 / ALB / SNS / alarms | as-is | — | Scale transparently; nothing to do |

**Known single-AZ trade-off (accepted at current scale):** fck-nat lives in one AZ. If af-south-1a has an outage, *outbound* calls from private subnets (OpenEMR sync, payment gateways, email) pause until EC2 auto-recover brings it back — inbound traffic via the ALB keeps working, and RDS/Redis are unaffected. The at-scale fix is one NAT per AZ (managed or fck-nat) with per-AZ route tables.

**Commitment interplay (matters for Phase 4):** RDS reserved instances are size-flexible *within a family* — a t4g RI covers t4g.medium→large, but jumping to m7g abandons it. If growth to m7g.large looks likely within 12 months, either buy the RI for what you'll run most of the year or skip the RDS RI and take only the Compute Savings Plan (which is family-agnostic for Fargate/EC2).

**Re-check cadence:** glance at Cost Explorer + the six signals above monthly; re-run the full audit (companion doc) quarterly or after any architecture change.

---

## Phase 1 — Zero/low-risk cleanup (~$110/mo) · anytime

> **STATUS (2026-07-14): EXECUTED** — 1.1 (13.247.44.2 released; 15.240.88.204 turned out to be the LIVE app-VPC NAT gateway's second AZ address — in use, keep; audit corrected), 1.2 ✓, 1.3 ✓, 1.4 ✓, 1.5 (instance was already terminated externally before execution; volume gone with it), 1.6 ✓ (archive: `snap-056250f35cc498cc6`), 1.7 ✓ (NAT deleted, EIP auto-released). **1.8 pending decision.**
> Phase 3 note: the app NAT has TWO EIPs (one per AZ) — when replacing with fck-nat, both release with the NAT gateway's deletion.
>
> **1.8 RESOLVED (2026-07-14): snapshot deleted.** Verification of the S3 export (`s3://hha-db-archive/snapshot-openemr/`, unfiltered) proved the snapshot's entire contents were ONE table — `postgres.public._prisma_migrations`, ~8 KB. Engine was PostgreSQL 18.3: despite the name, `hha-openemr-db` never held OpenEMR data (OpenEMR runs on MariaDB, on the EC2 box). The 400 GB was provisioned-but-empty storage. The 4 KB parquet export remains in `hha-db-archive` as a record; no Glacier lifecycle needed.

### 1.1 Release the two idle Elastic IPs (~$7/mo)

```powershell
# Confirm they are still unassociated (AssociationId must be empty)
aws ec2 describe-addresses --public-ips 13.247.44.2 15.240.88.204 `
  --query "Addresses[].{ip:PublicIp,assoc:AssociationId,alloc:AllocationId}" --output table

# Release each by AllocationId from the output
aws ec2 release-address --allocation-id <alloc-id-1>
aws ec2 release-address --allocation-id <alloc-id-2>
```
**Verify:** `aws ec2 describe-addresses` no longer lists them. **Rollback:** none needed (new EIPs can be allocated any time; these specific IPs are not referenced anywhere — DNS is on Vercel).

### 1.2 Delete the three dead S3 buckets

```powershell
# Confirm still (near-)empty before deleting
aws s3 ls s3://hha-temp-logo --recursive --summarize
aws s3 ls s3://openemr-2546da60-436e-11f1-983b-0affc0616aaf --recursive --summarize
aws s3 ls s3://openemr-33c5bca0-4369-11f1-b60f-069be4333bf9 --recursive --summarize

aws s3 rb s3://hha-temp-logo --force
aws s3 rb s3://openemr-2546da60-436e-11f1-983b-0affc0616aaf --force
aws s3 rb s3://openemr-33c5bca0-4369-11f1-b60f-069be4333bf9 --force
```
**Caution:** do NOT touch `hha-documents` (live patient uploads).

### 1.3 Delete the two orphan ALB target groups

```powershell
# Safety: confirm no listener rule forwards to them
$LB = aws elbv2 describe-load-balancers --names hha-main-alb --query "LoadBalancers[0].LoadBalancerArn" --output text
foreach ($L in (aws elbv2 describe-listeners --load-balancer-arn $LB --query "Listeners[].ListenerArn" --output text).Split()) {
  aws elbv2 describe-rules --listener-arn $L --query "Rules[].Actions[].TargetGroupArn" --output text
}
# The output must only contain hha-api-tg and hha-openemr-tg ARNs. Then:
aws elbv2 delete-target-group --target-group-arn <SA-HHA-Target-Group-arn>
aws elbv2 delete-target-group --target-group-arn <openemr-tg-arn>
```
(If a listener rule references one, delete/edit that rule first — it isn't serving anything with zero targets.)

### 1.4 Delete the dead RDS log group + set retention on flow logs

```powershell
aws logs delete-log-group --log-group-name /aws/rds/instance/hha-openemr-db/postgresql
aws logs put-retention-policy --log-group-name /vpc/hha-production-flow-logs --retention-in-days 90
```

### 1.5 Archive & terminate the old OpenEMR EC2 (i-029eda0a63e2d7316) (~$17/mo)

```powershell
# 1. Snapshot its 150 GB volume as an archive (cheap insurance, ~$4/mo, deletable later)
aws ec2 create-snapshot --volume-id vol-089545c988432c985 `
  --description "Archive: HHA-OpenEMR-Production root volume before termination (2026-07)" `
  --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=old-openemr-root-archive}]"
# Wait until State=completed:
aws ec2 describe-snapshots --filters "Name=volume-id,Values=vol-089545c988432c985" --query "Snapshots[].{id:SnapshotId,state:State,progress:Progress}" --output table

# 2. Terminate the instance (this deletes its attached volume unless DeleteOnTermination=false)
aws ec2 terminate-instances --instance-ids i-029eda0a63e2d7316
```
**Verify:** instance state → `terminated`; snapshot exists. **Rollback:** restore = create volume from snapshot + launch new instance (the current OpenEMR box is unaffected — double-check you are NOT touching `i-00acc8c4d004c4fc9`).

### 1.6 Snapshot-then-delete the unattached 20 GB volume (~$2/mo)

```powershell
aws ec2 create-snapshot --volume-id vol-03860b7e99a06293e --description "Archive: unattached 20GB volume (2026-07)"
# after snapshot completes:
aws ec2 delete-volume --volume-id vol-03860b7e99a06293e
```

### 1.7 Delete the default-VPC NAT gateway (~$47/mo)

```powershell
# Safety: confirm no route table still uses it for anything alive
aws ec2 describe-route-tables --filters "Name=route.nat-gateway-id,Values=nat-1b6c945f61d24be8c" `
  --query "RouteTables[].{id:RouteTableId,vpc:VpcId,assocs:Associations[].SubnetId}" --output table
# Expected: only default-VPC (vpc-0bcb06beee662d79c) route tables — the VPC that held the now-terminated old instance.

aws ec2 delete-nat-gateway --nat-gateway-id nat-1b6c945f61d24be8c
# After state=deleted (takes a few minutes), release its EIP:
aws ec2 describe-addresses --public-ips 15.240.90.170 --query "Addresses[0].AllocationId" --output text
aws ec2 release-address --allocation-id <that-alloc-id>
```
**Do NOT touch** `nat-1ba63dd2381a4f811` — that is the app VPC's egress (until Phase 3 replaces it deliberately).

### 1.8 The 400 GB OpenEMR RDS snapshot (~$38/mo) — decide, then act

Option A — **export to S3 + Glacier, then delete** (keeps the archive at ~$1.6/mo):
```powershell
# One-time: create an export bucket + IAM role per AWS docs (console is easiest: RDS → Snapshots → hha-openemr-db-snapshot → Export to Amazon S3)
# After the export completes and you can list the parquet files in S3:
aws s3 ls s3://<export-bucket>/<export-prefix>/ --recursive --summarize
# Move to Glacier Deep Archive:
#   S3 console → bucket → Lifecycle rule: transition to Glacier Deep Archive after 0 days
# Only then:
aws rds delete-db-snapshot --db-snapshot-identifier hha-openemr-db-snapshot
```
Option B — data already fully migrated into the Dockerized OpenEMR (verify by confirming patient/appointment counts in the live OpenEMR match expectations): delete directly.
**Rule:** never delete this snapshot until either the export is verified in S3 or the migration is positively confirmed — it is the only copy of the pre-June-10 OpenEMR database.

---

## Phase 2 — Right-sizing (~$330–400/mo) · maintenance window, ~15 min blip

> **STATUS (2026-07-14): EXECUTED** — 2.1 snapshot `hha-postgres-pre-rightsize-20260714` ✓ · 2.2 RDS now **db.t4g.medium, PubliclyAccessible=false** (modify 11:26→11:44 UTC; verified: tunnel psql OK, /health 200 from inside AWS) ✓ · 2.3 Redis via **modify-replication-group** (`hha-redis-cluster`) → **cache.t4g.micro** (15:24→15:38; data survived — refresh token still in Redis after) ✓ · 2.4 ARM64 shipped earlier (task def :93) ✓ · ECS force-redeploy stable, boot logs clean, all alarms OK.
> **Follow-up:** watch RDS `CPUCreditBalance` for 24–48h (burstable class).

The original window guidance below is retained for reference. Steps 2.1–2.3 bundled the RDS downsize, the **PubliclyAccessible=false security fix**, and the Redis downsize into one window.

### 2.1 Pre-flight

```powershell
# Manual safety snapshot of production Postgres
aws rds create-db-snapshot --db-instance-identifier hha-postgres `
  --db-snapshot-identifier hha-postgres-pre-rightsize-20260714
aws rds wait db-snapshot-available --db-snapshot-identifier hha-postgres-pre-rightsize-20260714
```

### 2.2 RDS: db.m5d.large Multi-AZ → db.t4g.medium Multi-AZ + make private (−$280–350/mo)

```powershell
aws rds modify-db-instance `
  --db-instance-identifier hha-postgres `
  --db-instance-class db.t4g.medium `
  --no-publicly-accessible `
  --apply-immediately
# Watch: Multi-AZ performs the change on the standby first, then fails over (typically 1–2 min of downtime)
aws rds describe-db-instances --db-instance-identifier hha-postgres `
  --query "DBInstances[0].{class:DBInstanceClass,status:DBInstanceStatus,public:PubliclyAccessible}" --output table
```
**Verify after `available`:**
- API health: `https://api.myvaultplus.com/api/v1/health` (or `/ready`)
- Portal login + dashboard loads
- SSM tunnel still works (`tunnel-db.ps1` → psql `SELECT 1`) — the tunnel goes through the VPC, so `PubliclyAccessible=false` must not break it
- CloudWatch: RDS CPU + freeable memory look sane under normal traffic for a day; CPUCreditBalance not draining (t4g is burstable)

**Rollback:** same `modify-db-instance` back to `db.m5d.large` `--apply-immediately`. The pre-flight snapshot is the disaster hatch.

### 2.3 ElastiCache: cache.t3.small → cache.t4g.micro (−$25/mo)

Redis holds only rebuild-able state (Bull queue jobs, pull cursors, feature-flag cache) and the OpenEMR refresh token, which has a Secrets Manager fallback — a brief flush is tolerable at 02:00.

```powershell
# Try in-place vertical scale first:
aws elasticache modify-cache-cluster --cache-cluster-id hha-redis-cluster-001 `
  --cache-node-type cache.t4g.micro --apply-immediately
aws elasticache describe-cache-clusters --cache-cluster-id hha-redis-cluster-001 `
  --query "CacheClusters[0].{type:CacheNodeType,status:CacheClusterStatus}" --output table
```
If the API rejects scale-DOWN for this cluster type: create `hha-redis-2` (same subnet group + SG, cache.t4g.micro), update the Redis host in `hha/production-env` secret, force a new ECS deployment (`aws ecs update-service --cluster hha-cluster --service hha-api-service --force-new-deployment`), verify, then delete the old cluster.

**Verify:** API starts clean (Bull queues re-register their repeatable jobs on boot — the OpenEMR service logs "refresh token restored from Secrets Manager" if Redis came up empty); an appointment confirm round-trips to OpenEMR.

### 2.4 Fargate on Graviton (−$5–10/mo) — code change, ships via normal PR flow

1. CI build: add `--platform linux/arm64` (docker buildx) to the API image build in `.github/workflows/backend.yml`.
2. Task definition: `"runtimePlatform": { "cpuArchitecture": "ARM64", "operatingSystemFamily": "LINUX" }`.
3. Confirm base image + native deps (bcryptjs ✓ pure JS, sharp ✓ ships arm64 binaries, prisma ✓ arm64 engines) — all fine on `node:20` arm64.
4. Deploy via the normal PR → development → master pipeline; watch the first task start logs.
**Rollback:** revert the PR (X86_64 task def revision is retained — can also `update-service` back to the previous task-def revision instantly).

---

## Phase 3 — NAT replacement in the app VPC (~$43/mo net) · low-traffic window

> **STATUS (2026-07-14): EXECUTED** — fck-nat `i-076309f91635cff74` (t4g.nano, AMI 1.4.0-20260701 arm64) in `hha-public-a`, SG `sg-01811646d5ae21644` (VPC-CIDR ingress), src/dst check off, EIP **15.240.45.130** (`hha-fck-nat-eip`). Default route on `rtb-0453ec6c5b0ce6156` repointed to `eni-0dee5d388f63f8633`. Egress verified: ECS force-redeploy stable (ECR+Secrets via fck-nat), /health 200, and 15:00–15:15 OpenEMR pull cycles all clean. Managed NAT `nat-1ba63dd2381a4f811` **deleted** (both its EIPs auto-released). S3 gateway endpoint `vpce-032a54ca7b006ff80` added. Auto-recovery alarms set (system-check→recover, instance-check→reboot).
> Note: the two RDS public EIPs also disappeared — released automatically by Phase 2's `PubliclyAccessible=false`. Account now holds exactly 3 EIPs: ALB×2 + fck-nat.
> **If an external service ever needs IP whitelisting, the outbound IP is now 15.240.45.130.**

Replace `nat-1ba63dd2381a4f811` with a **fck-nat** instance (t4g.nano ≈ $4/mo).

1. Launch the latest fck-nat AMI (search Community AMIs `fck-nat-al2023-*-arm64` in af-south-1) as **t4g.nano** in a **public** subnet of `vpc-0770a578eb5617fd2`, with a security group allowing all traffic **from the VPC CIDR (10.0.0.0/16)** and all outbound.
2. Disable source/dest check:
   ```powershell
   aws ec2 modify-instance-attribute --instance-id <fck-nat-id> --no-source-dest-check
   ```
3. Find the private route tables currently pointing at the NAT gateway:
   ```powershell
   aws ec2 describe-route-tables --filters "Name=route.nat-gateway-id,Values=nat-1ba63dd2381a4f811" `
     --query "RouteTables[].RouteTableId" --output text
   ```
4. Repoint each: `aws ec2 replace-route --route-table-id <rtb> --destination-cidr-block 0.0.0.0/0 --network-interface-id <fck-nat-eni>`
5. **Verify egress immediately:** OpenEMR sync still works (confirm an appointment → calendar event), Paystack/Resend calls succeed, `/admin/system/errors` stays quiet for 30 min.
6. Only then: `aws ec2 delete-nat-gateway --nat-gateway-id nat-1ba63dd2381a4f811` and release EIP 15.240.109.56 once deleted.
7. Add the free S3 gateway endpoint (cuts NAT/egress charges for S3 traffic):
   ```powershell
   aws ec2 create-vpc-endpoint --vpc-id vpc-0770a578eb5617fd2 `
     --service-name com.amazonaws.af-south-1.s3 --vpc-endpoint-type Gateway `
     --route-table-ids <same-private-rtb-ids>
   ```
**Rollback:** recreate a NAT gateway in the public subnet and `replace-route` back (10 minutes). Keep the fck-nat instance on a CloudWatch status-check alarm → the trade-off vs managed NAT is you own this single instance's health.

---

## Phase 4 — Commitments (~30% off steady-state) · after ~30 days stable

1. Confirm 30 days of stable sizing (no class changes pending).
2. **RDS Reserved Instance:** 1-year, no-upfront, `db.t4g.medium` Multi-AZ PostgreSQL in af-south-1 (Console → RDS → Reserved instances → Purchase). ~30–38% off.
3. **Compute Savings Plan:** 1-year, no-upfront, commit ≈ the steady hourly spend of Fargate + the OpenEMR t3.medium + fck-nat (Console → Billing → Savings Plans → recommendations will compute the number after 30 days of data).
4. Do **not** commit ElastiCache (tiny) or anything still being resized.

---

## Post-optimization checklist

- [ ] Billing → Cost Explorer: month-over-month drop visible in EC2-Other (NAT/EBS/EIP), RDS, ElastiCache lines
- [ ] All 5 CloudWatch alarms still OK (they reference instance IDs that survived; the Redis alarm may need repointing if the cluster was recreated)
- [ ] `docs/deployment.md` runbook updated: RDS now genuinely private; NAT is a fck-nat instance
- [ ] Budget alert: create one (Billing → Budgets) at ~$350/mo so drift gets flagged

## Expected end state

| Line | Before | After |
| --- | --- | --- |
| RDS | ~$400–500 | ~$120 (RI: ~$80) |
| NAT + idle EIPs/EBS/old EC2/snapshot waste | ~$160 | ~$10 |
| ElastiCache | ~$38 | ~$13 |
| Fargate + OpenEMR EC2 + ALB + misc | ~$140 | ~$120 (SP: ~$90) |
| **Total** | **~$700–800** | **~$260 → ~$200 with commitments** |
