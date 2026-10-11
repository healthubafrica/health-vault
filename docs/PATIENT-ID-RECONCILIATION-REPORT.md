# Patient HHA ID Reconciliation Report

> Generated 2026-08-17, read-only. Companion to [Patient Portal ID Sync Issue.md](./Patient%20Portal%20ID%20Sync%20Issue.md).
> **No backfill has been executed.** This report is the required pre-backfill review artifact the spec calls for — nothing below has touched `patient_data.HHA_ID` on any of these 46 records.

## Summary

- OpenEMR `patient_data` total: **55** patients (grown from the 54 recorded in the original spec — 1 new registration since)
- Missing `HHA_ID`: **46**
- Portal (`patients` table) total: **45**, all 45 already have a stored `openemr_patient_uuid` — meaning the *going-forward* sync gap (§Patient Portal ID Sync Issue fix, shipped today) is now closed; this report only covers the pre-existing backlog.

| Action | Count | Meaning |
|---|---|---|
| **AUTO-MATCH** | 41 | Matched via the portal's own stored `openemr_patient_uuid` (Match Method priority #1 per the spec) — the same patient, unambiguous, high confidence |
| **NO_PORTAL_MATCH** | 5 | No corresponding portal patient found by any method |
| MANUAL REVIEW | 0 | — |
| CONFLICT | 0 | — |

## The 5 NO_PORTAL_MATCH records, checked individually

All five are explainable and **not** real patients missing from the portal by accident:

| OpenEMR PID | Name | Email | Explanation |
|---|---|---|---|
| 24 | Vault E2ETest | `vault-e2e-test-...@healthhubafrica-test.internal` | E2E test fixture — sentinel test domain |
| 25 | Appt E2ETest | `appt-e2e-patient-...@healthhubafrica-test.internal` | E2E test fixture — sentinel test domain |
| 26 | Payments ScratchTest | `payments-test-scratch@example.com` | Manual payment-flow scratch test |
| 58 | CRQTEST PATIENT | *(none)* | UAT fixture for the CRQ partner-routing spec (UAT-02/03 in the Universal Registration doc) |
| 59 | RAOTEST PATIENT | *(none)* | UAT fixture for the Dr. Rao ENT partner-routing spec (UAT-04) |

None of these were ever created through the portal, so there is no portal HHA ID to backfill them with — correctly excluded, not a data-quality problem.

## Full reconciliation table (the 41 auto-matched + 5 unmatched)

| OpenEMR PID | Patient Name | DOB | Email | Portal HHA ID | Match Method | Confidence | Action |
|---|---|---|---|---|---|---|---|
| 12 | Rachel Obire | 1998-04-06 | jolaobire@gmail.com | HHA-LAG-202606-0005 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 13 | Health-Hub Africa | 2026-06-02 | healthubafrica@gmail.com | HHA-LAG-202606-0001 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 14 | Precise Kunle | 1990-01-01 | precisekunle@gmail.com | HHA-LAG-202606-0006 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 15 | Adekunle Owolabi | 1998-09-02 | okikikunleowo@gmail.com | HHA-LAG-202606-0004 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 16 | Niyi Patient | 2000-06-03 | benobire@yahoo.com | HHA-LAG-202606-0002 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 17 | David Obire | 2012-07-01 | kdobire2127@gmail.com | HHA-LAG-202606-0003 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 18 | omotosho oladeji | 2008-01-03 | tosholadeji@yahoo.com | HHA-LAG-202606-0008 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 19 | Kelechi Aso | 2024-04-11 | kcaso537@gmail.com | HHA-LAG-202606-0007 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 21 | Abigail Aghogho | 2003-05-11 | abigailaghogho@gmail.com | HHA-LAG-202606-0011 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 22 | Nneoma Victoria | 1995-03-24 | nwannanneoma@gmail.com | HHA-LAG-202606-0012 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 23 | Olufemi Johnson | 2012-06-08 | benobire@gmail.com | HHA-LAG-202606-0013 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 24 | Vault E2ETest | 1990-01-01 | vault-e2e-test-...@healthhubafrica-test.internal | — | None | N/A | **NO_PORTAL_MATCH** |
| 25 | Appt E2ETest | 1990-01-01 | appt-e2e-patient-...@healthhubafrica-test.internal | — | None | N/A | **NO_PORTAL_MATCH** |
| 26 | Payments ScratchTest | 1990-01-01 | payments-test-scratch@example.com | — | None | N/A | **NO_PORTAL_MATCH** |
| 27 | Samuel Obire | 1974-09-15 | newdesire4life@gmail.com | HHA-LAG-202606-0009 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 28 | Benjamin Oji-Okechukwu | 2000-10-11 | bennyoji1@gmail.com | HHA-LAG-202607-0001 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 29 | Chisom Iwuajoku | 2003-01-15 | anuuiwu@gmail.com | HHA-LAG-202607-0002 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 30 | Success Sotonwa | 2003-02-06 | sotonwasuccess1@gmail.com | HHA-LAG-202607-0003 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 31 | Valour Onwuchekwa | 2002-11-05 | valouronwuchekwa@gmail.com | HHA-LAG-202607-0004 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 32 | Emmanuel Semako-Peter | 2004-09-05 | sehuyepeter@gmail.com | HHA-LAG-202607-0005 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 33 | Ogheneruona Mak | 2002-12-13 | ruona.mak@gmail.com | HHA-LAG-202607-0006 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 34 | Ohwoviroro Michael | 2003-02-08 | ohwoviroromichael@gmail.com | HHA-LAG-202607-0007 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 35 | Tomisin Omoyefa | 2001-01-01 | tomisin0005@gmail.com | HHA-LAG-202607-0008 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 36 | Ode Christopher | 2002-03-27 | c89lash@gmail.com | HHA-LAG-202607-0009 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 37 | Kayla Fanen-Acho | 2026-07-19 | kaylafacho@gmail.com | HHA-LAG-202607-0010 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 38 | Divine Ebidero | 2002-06-10 | ebiderodivine1@gmail.com | HHA-LAG-202607-0011 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 39 | Chiamaka Euphemia | 1991-06-14 | ceuphemia59@gmail.com | HHA-LAG-202607-0012 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 40 | Abby Patient | 2000-04-13 | Iyowunaibinabo@gmail.com | HHA-LAG-202607-0013 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 41 | Eloho Mildred Irobo | 2003-05-04 | millyeloho@gmail.com | HHA-LAG-202607-0014 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 42 | Joy Olateju | 2005-02-14 | 09joyolateju@gmail.com | HHA-LAG-202607-0015 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 43 | Nix Patient | 1990-01-01 | nixesak469@ezimb.com | HHA-LAG-202607-0016 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 44 | Ebubechukwu Onwudiegwu | 2003-05-30 | eonwudiegwu@gmail.com | HHA-LAG-202607-0017 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 45 | Ebubechukwu Onwudiegwu | 2003-05-30 | ebubechukwu.onwudiegwu@stu.cu.edu.ng | HHA-LAG-202607-0018 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 46 | Jide Bajulaiye | 1964-06-30 | babusji@yahoo.co.uk | HHA-LAG-202607-0019 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 47 | Maryam Ahmed Almustapha | 1996-05-09 | almustaphamaryam@gmail.com | HHA-LAG-202607-0020 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 48 | Chuka Nwanna | 1998-12-26 | nwannachuka9@gmail.com | HHA-LAG-202607-0021 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 49 | Uzoma Felicia Chukwuebuka | 1990-01-01 | uzomafeliciac94@gmail.com | HHA-LAG-202607-0022 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 50 | Okafor Emmanuel | 1995-06-07 | officialokafor@gmail.com | HHA-LAG-202607-0023 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 52 | Worthy Chukwuemeka | 2002-04-11 | worthychukwuemeka@gmail.com | HHA-LAG-202607-0026 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 53 | Emeka Okoli | 1990-01-01 | emekaokoli00@gmail.com | HHA-LAG-202607-0025 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 54 | Jewel Abasita | 2001-10-21 | abasitaj@gmail.com | HHA-LAG-202607-0027 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 55 | Idanesi Kadiri | 2000-11-26 | idanesikadiri2@gmail.com | HHA-LAG-202607-0028 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 56 | Oladipupo Adeboya | 1979-09-04 | ola.adeboya@gmail.com | HHA-LAG-202608-0001 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 57 | Hcjg Patient | 1990-01-01 | r3e68w4tw5@inboxdrop.online | HHA-LAG-202608-0002 | OpenEMR UUID (stored portal↔OpenEMR link) | HIGH | **AUTO-MATCH** |
| 58 | CRQTEST PATIENT | 1990-01-01 | *(none)* | — | None | N/A | **NO_PORTAL_MATCH** |
| 59 | RAOTEST PATIENT | 1990-01-01 | *(none)* | — | None | N/A | **NO_PORTAL_MATCH** |

## Methodology

Per the spec's stated matching priority order:

1. **Stored OpenEMR PID/UUID relationship** (portal `patients.openemr_patient_uuid` vs. `HEX(patient_data.uuid)`) — used for all 41 matches. This is the strongest possible signal: it's the exact link the portal itself created and has maintained since the patient was first synced, not an inference from PII.
2. Email + DOB — not needed; every real portal-originated patient resolved at tier 1.
3. Name + DOB + email — not needed, same reason.

No ambiguous or conflicting matches were found — every OpenEMR patient missing an `HHA_ID` either has exactly one clean UUID-linked portal record, or is a known test/UAT fixture with no portal record at all. There is no `MANUAL REVIEW` or `CONFLICT` bucket to work through for this backlog.

## Recommended next step (not yet executed)

Backfill the 41 `AUTO-MATCH` rows by calling the same endpoint the go-forward fix now uses (`PATCH /api/hha/patient/:uuid/hha-id`) once per row, using each row's own `openemr_patient_uuid` and `Portal HHA ID` — i.e. run the *existing, already-deployed, already-tested* sync logic against the backlog rather than writing a separate one-off backfill script. That keeps a single code path (and its conflict/duplicate protections) responsible for every write to `patient_data.HHA_ID`, present and past. Since all 41 are unambiguous auto-matches, this is a mechanical run, not a judgment call — but it still writes to production and is being held for your explicit go-ahead per the spec's "do not execute the production backfill until reviewed" instruction.
