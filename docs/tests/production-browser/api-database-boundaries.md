# API, database and operational obligations

Status: **NOT VERIFIED in this documentation change**. These obligations survive the plan split and cannot be accepted by browser appearance alone.

| Original units | Required separate evidence |
| --- | --- |
| B09 | Auth/users/roles/permissions MCP discovery and tool authorization match REST policy. Use internal Najm MCP/REST and the repository Najm skill at execution. |
| D08-D10 | Staff-role/zone lifecycle if no management UI; global search if absent; student/parent/teacher projection fields and privacy. |
| F04 | Legacy alert lifecycle, audience/status and protected health-alert command if no UI is exposed. |
| G04-G07 | Payments, installments, allocations and credit exact reconciliation, rollback, concurrent writers, uniqueness and idempotency. |
| G10-G13 | Rollover idempotency/calendar boundaries, notification generation/duplicate delivery and physical append-only audit enforcement. |
| H05-H06 | Refuel/maintenance lifecycle if no browser control exists, plus vehicle linkage and validation. |
| I01 | Health response and readiness; no secret disclosure. Health is not migration/schema currency. |
| I02 | Role-correct academic, finance and operations dashboard projections. |
| I03 | Seed definitions, all role grants, idempotency and cleanup dependency order against a disposable database; never production seeding for browser acceptance. |
| I04 | Catch-all route-handler composition for every supported HTTP verb. |
| I05 | Distinct localized validation, unauthenticated, forbidden, missing, conflict and server-error envelopes. |

Retain the [complete original matrix](reference/feature-matrix.md) and [auth contract](reference/auth-contract.md), including revocation/cache-loss behavior, reset-token concurrency and rate-limit ownership. Browser tests cannot directly prove hashes/encryption, physical constraints, locks, migration state or unexposed audit rows.

Financial expectations reconcile exact integer minor units at server boundaries and correctly formatted amounts in the UI. Inspect the actual API contract before comparing transport values; do not infer financial correctness from formatting.

Current committed role/grant sources: [roles](../../../packages/seed/src/scripts/admin/data/roles.json), [role permissions](../../../packages/seed/src/scripts/admin/data/rolePermissions.json). Cover admin, principal, accounting, teacher, student, parent, counselor, nurse, secretary, librarian, driver and assistant using controlled accounts; derive access from actual grants.

Keep the [Routine migration and acceptance record](../routine-timetable.md) and [partial reset incident](../seed-reset-routine.md) open until their specific connected/database checks are proved.
