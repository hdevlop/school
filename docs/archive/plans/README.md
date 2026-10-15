# Archived plans

Archived 2026-10-15 to remove completed migration plans and superseded drafts
from the active plan directory. These are historical implementation records;
their versions, working-tree statements and verification results describe the
recorded checkpoint. Use current source and the [active plans](../../plans/README.md)
for new work. Pending checks below are retained, not marked complete.

| Record | Reason archived and retained obligations |
| --- | --- |
| [Feature config migration](KAFIL-STYLE-FEATURE-CONFIG-MIGRATION-PLAN.md) | Implemented on 2026-09-21; preserves migration choices and verification. |
| [Najm config consolidation](NAJM-CONFIG-CONSOLIDATION-PLAN.md) | Marked implemented on 2026-10-10; package and consumer evidence remains in the record. Deployment is a separate proof boundary. |
| [Owned property adoption](owned-property-adoption.md) | Published and adopted with source gates passed; connected database/API/browser acceptance was not run for this migration. |
| [Service validator cleanup](service-validator-cleanup.md) | Completed on 2026-09-28; connected database/API/browser acceptance was not run for this refactor. |
| [Workspace standardization v2](WORKSPACE-STRUCTURE-STANDARDIZATION-PLAN.md) | Implemented locally; Docker image, Redis-backed production runtime, HTTPS and Linux shutdown checks were still open at its checkpoint. See the [evidence index](../../evidence/workspace-standardization-v2/README.md) and current [workspace architecture](../../architecture/workspace.md). |
| [Workspace standardization v1](workspace-standardization-v1.md) | Superseded by v2; original Docker/runtime obligations remain recorded. |
| [Academic-year history](SCHOOL-ACADEMIC-YEAR-HISTORY-PLAN.md) | Implemented year/ownership flow; section 0 remains the implementation reference. Remaining owner policy/review items are recorded here; checks and results remain in the [year ledger](../../tests/academic-year-history.md) and [browser checklist](../../tests/academic-year-browser-checklist.md). |
| [Academic-year scope inventory](academic-year-scope-inventory.md) | Dated preparation inventory for the implemented year flow. |
| [Jev and router](CHATBOT-JEV-ROUTER-PLAN.md) | Implemented local routing and provider cleanup; ongoing answer-quality checks belong in the [validation guide](../../tests/jev-router-validation.md). Remote deployment is not established by archiving. |
| [User access reset](USER-ACCESS-RESET-PLAN.md) | Implemented recovery flow; remaining connected/database/mail/browser checks stay in the [access-reset checklist](../../tests/production-browser/access-reset.md) and [full auth contract](../../tests/production-browser/reference/auth-contract.md). |
| [Academic-year draft before ALS service properties](reference/academic-year-history-before-als-service-property-2026-09-27.md) | Superseded by the active academic-year plan. |
| [Academic-year draft before year context](reference/academic-year-history-before-year-context-2026-09-27.md) | Superseded by the active academic-year plan. |

The two academic-year drafts remain byte-for-byte snapshots. Their original
relative links and status claims are historical; use the [implemented history reference](SCHOOL-ACADEMIC-YEAR-HISTORY-PLAN.md)
and [evidence ledger](../../tests/academic-year-history.md) for navigation and
the outstanding historical-data, integrity and acceptance obligations.
