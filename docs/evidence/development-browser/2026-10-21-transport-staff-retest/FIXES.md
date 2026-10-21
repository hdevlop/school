# Transport and staff fixes: development acceptance

All four defects from the [initial retest](README.md) were fixed locally and
retested on **2026-10-21**, at **http://localhost:3102**, academic year
**2026-2027**. Standalone Playwright used installed **Chrome 155.0.8059.86**;
no browser plugin was used. [Results](fix-results.json) retain 26 passing
workflow checks, API outcomes, verification and cleanup. The
[source fingerprint](fix-source-fingerprint.json) identifies the tested files
in the shared, uncommitted checkout.

| Reported defect | Change and observed result |
| --- | --- |
| Driver blocked by an unexplained empty vehicle list | Selecting Driver shows setup guidance if the vehicle lookup succeeds with no records. The Assignments step offers Create Vehicle to permitted users, opening a nested dialog. Creating a real vehicle returned to the staff draft, selected that vehicle, preserved all earlier steps and allowed the driver to save. Cancel preserved assignment notes. A failed lookup showed an error with Try again; retry restored real options. Bus assistants use the same setup guidance. |
| Expired license accepted | The wizard rejects an expired date immediately and blocks Next in step 2. Missing driver license fields are checked there too, including when salary is blank. The API rejects expired and malformed dates on create or profile update. A license expiring today saved successfully; persisted reads matched. REST refused an expired create and partial update with HTTP 400; MCP refused an expired update. The refused update preserved the prior expiry, and the refused create left no staff row. |
| Required-field validation delayed until Next | Staff controls validate on blur, discrete selections validate on change, and correcting an error clears it before Next. Chrome checks covered invalid Name, correction, missing License Number and expired License Expiry. The shared WizardForm remains the only form owner. |
| Missing assignment confirmation | A real student assignment returned HTTP 200 and showed a Sonner success toast. Reload retained the student and `1/30` occupancy. Stored fees still totaled **21,600 dh**, including **nine monthly transport installments of 400 dh**. |

English desktop was exercised at 1440 x 1000. English, French and Arabic phone
checks used 390 x 844. Setup actions and expiry feedback were translated; the
Arabic document had `dir=rtl`, with no horizontal page overflow. English and
Arabic phone screenshots were visually inspected. Spanish translations were
checked by schema/catalog tests, without a Spanish browser journey.

The no-vehicle and failed-lookup conditions were browser-only GET response
fixtures. Creation and assignment responses were real; no school reset or
production response mocking occurred. External browser requests were blocked,
so fonts/maps were not accepted as part of this run. Internal Najm MCP/REST
supported fixture setup, persisted-value checks and exact cleanup.

All seven owned records were deleted through supported MCP operations: student
route, two unpaid fees, student, driver assignment, staff member and vehicle.
Authenticated REST reads returned **404 for all seven**. No login account was
created for either person. Existing records were preserved; normal audit
records may remain.

Verification passed:

- 11 focused staff schema and server license tests.
- 23 server localization/license tests, including the same four license tests.
- 582 configuration tests across 81 files, including the staff schema tests.
- 28 package/boundary tests and the workspace import-graph check.
- Root lint, root typecheck and the four-locale translation-key check.
- Final production build in isolated `.next-transport-staff` output.

An intermediate configuration run had 573 passes and one failure: another
concurrent change introduced shared regional defaults while its test still
expected the old defaults. That work subsequently corrected the mismatch;
the final 582-test run passed. These staff/transport fixes did not alter the
regional-default implementation or its test. Selector corrections and a
development-badge pointer interception are recorded in the results rather than
counted as product failures. Initial cleanup reads used an expired cookie;
authenticated bearer reads established the final 404 results.

Unrelated working-tree changes were preserved. No commit, push, production
request or deployment was performed. Production acceptance remains separate.
