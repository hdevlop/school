# Finance reports: development browser verification

**73 assertions PASS, zero FAIL**, on **2026-10-18**, against the existing demo
at **http://127.0.0.1:3102**, selected year **2026-2027**. This is isolated
Chromium (Chrome 155), with fresh authenticated sessions. The connected browser
was unavailable. Production acceptance remains separate.

| Journey | Assertions | Evidence |
| --- | --- | --- |
| Actual totals, legends, months, class balances, reloads, phone/RTL and collection retry | 61 PASS | [Browser results](browser-results.json) |
| French/Arabic failures and real-server recovery for all three charts | 12 PASS | [Error/retry results](error-results.json) |

The rendered expense total is **142,308 MAD**, including **896 MAD in utilities**.
All six legend amounts reconcile to that total, with utilities in the
**5,617 MAD Other** bucket. All six pie sectors render. Final screenshots wait
for complete pie geometry after animation.

The desktop trend shows all **12 reporting-month labels**, including July and
August. Phone axes compact their labels while retaining the final reporting
month. This tests the axis, not cash receipts in future summer months or
payment-cutoff enforcement.

Each of the **nine collection classes** has matching billed/paid amounts in
the table and supporting live MCP reads. Reload preserves the expense total.
French light desktop (1440 x 1000), French dark phone and Arabic dark phone
(390 x 844 with touch emulation) pass. Arabic uses RTL; the page has no
horizontal overflow.

## Defect fixed during the browser run

A controlled collection-query failure showed an alert and retry button, but
its French message was **Something went wrong**. The
[before-fix record](before-fix.json) and [screenshot](before-localized-error.png)
retain this defect. All three finance report cards now pass School's existing
translated feedback message to the shared card; no package or catalog changed.

Retests verify French and Arabic guidance/retry for the trend, expense and
collection charts. Desktop keyboard activation and phone touch activation
restore real 200 responses and remove alerts. The main accepted run records
two intentional collection network failures; both accepted runs have zero
unhandled page errors. Failure checks abort selected browser requests rather
than fulfilling them with fabricated response bodies. They do not complete the
production guide's unmocked server-failure requirement.

## Visual evidence

- [French desktop expenses](fr-desktop-light-expenses.png)
- [French phone expenses](fr-phone-dark-expenses.png)
- [Arabic phone expenses](ar-phone-dark-expenses.png)
- [Arabic phone collection](ar-phone-dark-collection.png)
- [French failure](fr-collection-error.png)
- [Arabic failure](ar-collection-error.png)

Screenshots were inspected. They retain floating assistant/development
controls, which can cover part of the lower legend at the captured phone
scroll position. Full contrast, screen-reader, zoom and physical-device
acceptance remain outside this batch.

[Validation](validation.json) records source hashes, final source checks and
excluded harness attempts. Read-only audit-list POST and MCP discovery calls
are classified separately from writes. Earlier attempts are excluded from
accepted totals. No production checkbox was changed.

No financial fixture was created and no financial mutation was observed.
Supporting reads used internal MCP. Fresh sign-ins create normal auth session
state; all isolated contexts closed. This session performed no production
deployment. Credit UI, payment-cutoff enforcement and the remaining transport
and attendance workflows remain separate work.
