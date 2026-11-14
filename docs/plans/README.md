# Active plans

Reviewed 2026-10-15. Keep proposed implementation work here. Implemented work,
completed migrations and superseded drafts live in the [archive](../archive/plans/README.md).
Remaining acceptance belongs in the test guides; it does not keep an implemented
plan active. Archiving a plan does not establish deployment or close its checks.

| Plan | Work still tracked |
| --- | --- |
| [Production embeddings](PRODUCTION-EMBEDDINGS-PLAN.md) | Proposed production infrastructure; not applied according to the plan. |
| [Homework](HOMEWORK-PLAN.md) | Phases 1-4 implemented 2026-11-13: homework, photo attachments, compression, limits, cleanup, parent acknowledgment, disk monitoring; backups leave the files out. Left: migrate and adopt the role defaults, the transport and browser checks, HEIC on the production image (§11.3). |
| [Massar grade sheets](MASSAR-GRADES-PLAN.md) | One-page dashboard, paper entry, due dates, acceptance locking and local migrations implemented. Left: owner visual review and real Massar checks. [Verification](../tests/massar-grades.md). |

For follow-up verification, use the [academic-year ledger](../tests/academic-year-history.md),
[Jev/router validation guide](../tests/jev-router-validation.md) and
[access-reset checklist](../tests/production-browser/access-reset.md), including
its linked full auth contract. The [archived history plan](../archive/plans/SCHOOL-ACADEMIC-YEAR-HISTORY-PLAN.md)
retains the year/ownership implementation recipe in section 0.

The [production browser execution plan](../tests/production-browser/execution-plan.md)
is a current testing work order and remains in the test guides.
