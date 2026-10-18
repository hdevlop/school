# Finance reports: totals, failures and production error masking

Date: **2026-10-18**. Continuation of the
[finance API/database follow-up](../2026-10-18-finance-followup/README.md).
This batch fixes three report display defects locally and verifies the existing
production error-response boundary. Browser discovery returned no available
browser, so these results do not accept a browser or production checklist case.

## Changes

- **Expense totals omitted utilities.** The chart filtered out utilities before
  calculating its total and Other bucket. A 100.00 supply expense plus 35.25
  utilities displayed only 100.00; a utilities-only period looked empty. The
  compact legend now includes utilities in Other, preserves an existing Other
  category without duplicating it, and totals all categories in cents.
- **Failed collection queries looked empty.** The collection-by-class chart
  ignored the query error and offered no retry. It now passes the error and
  retry handler to the existing shared card, with empty feedback reserved for
  successful empty responses. This rendering change is source/type checked;
  browser failure/retry acceptance remains open.
- **Cash trends omitted July and August.** The server reports cash over the
  selected year's reporting interval, but the chart removed both summer
  months. The chart now retains them, including July closeout receipts, while
  continuing to leave future figures unknown. Billing stays September-June.

The focused calculation tests cover utilities-only data, mixed spending,
category ranking/counts, exact cent reconciliation, valid empty data and summer
cash. These are part of the configuration suite, not additional independent
browser assertions.

## Error-response acceptance

`FinanceReportErrorsTransport.test.ts` runs against the separately marked local
`school_history_test` fixture, using authenticated School finance REST and MCP
routes. It starts the app in development mode, then switches `NODE_ENV` only
around the tested response boundary. It does **not** prove a complete production
startup, Next proxy behavior or a deployed origin.

The expense repository is temporarily faulted with a real PostgreSQL
missing-column query; a second case throws an explicit internal server error.
Both cases verify REST 500 with a generic message, MCP `isError` with a generic
message, no SQL canary/stack details in the client response, server-side error
logging, and a successful read after removing the fault. A third case verifies
that REST retains an actionable 409 refusal.

The read-only Najm source versions match School's pins: `najm-core@3.1.0` and
`najm-mcp@2.2.5`. Their existing masking already satisfies these tests, so this
batch adds no application error handler and changes no shared package.

MCP also generalizes ordinary domain errors to `Tool execution failed`. An
initial test expected the REST 409 message to survive in MCP and failed; source
inspection confirmed the current shared contract and the final test records
that generic MCP refusal explicitly. Actionable MCP domain messaging remains
a shared-package limitation. Enabling `exposeErrorDetails` would disclose the
internal errors just tested and was not used as a workaround.

## Evidence and limits

[Validation](validation.json) records command outcomes and source fingerprints.
[Error cases](error-results.json) contain sanitized accepted case names and the
[cleanup comparison](cleanup.json) records counts and content hashes for all
16 checked financial/settings/person tables. They remain unchanged. The real
PostgreSQL fault makes no data writes; only fixture authentication creates
ordinary session state outside those 16 tables.

The production build uses a separate output directory, preserving the running
development server. No deployment, real email/push delivery, export feature,
credit UI or payment-cutoff enforcement was added. Production checkboxes stay
unchanged. Full browser verification of the three chart changes and the real
production failure state remains open.
