# Shared UI defects: School development recheck

Executed on 2026-10-18 against **http://127.0.0.1:3102**, using isolated
headless Chromium and the existing local demo. School pins **najm-kit 3.6.3**;
the read-only Desktop reference has the same version. This batch verifies the
published fixes already adopted by School. It changes no application code,
dependency pin or translation and performs no production acceptance.

**134 unique browser checks PASS**, with zero final failures. The accepted main
matrix and focused phone-filter follow-up are combined without counting repeat
checks twice. The previously recorded shared failures are resolved in the
tested development views:

- Empty name/title searches show School's translated filtered-empty state on
  Users, Staff, Teachers, Cycles, Classes, Sections, Subjects, Exams and
  Assessments. Filters remain available; clearing restores the same row IDs.
  French desktop explicitly exercises both cards and table mode. French light
  and Arabic dark phone views exercise cards at 390 x 844.
- Students and Sections expose the class combobox under its translated
  accessible name. Keyboard opening and choosing CP preserve that name.
- The teacher wizard retains unsaved text, salary and experience through
  Previous and step-header navigation. Backward navigation permits an invalid
  salary and preserves it; Next still refuses it. An unsubmitted assignment
  array also survives Previous. Cancelling closes the unsaved wizard.

[Results](results.json) retain the final checks, diagnostics and write counts.
[Validation](validation.json) records source hashes and the passing 547
configuration tests plus 28 workspace-boundary tests and import scan. The
normal browser journeys produce no business writes; no person, fee or
employment record is submitted. No fixture cleanup is needed. Authentication
and session refresh may write their normal metadata; no all-database snapshot
or audit cleanup is claimed. Every owned browser context is closed.

The connected-browser runtime had no available browser. These results are
isolated Chromium acceptance, with no connected-browser or physical-device
claim. Screenshots were inspected locally and remain in ignored private
artifacts. [Initial harness attempts](browser-attempts.json) remain separate
from accepted totals: an incorrect Staff translation lookup, an assumed
Subjects class filter, phone hydration timing and the Next.js development
indicator overlapping the Arabic Next button. The final script uses the
visible primary filters or the phone filter menu, and normal clicks on an
uncovered part of that button;
it changes no DOM or product configuration.

This closes the specific development failures retained in the earlier
[Users](../2026-10-18-users/README.md),
[Staff](../2026-10-18-staff/README.md),
[Students](../2026-10-18-students/README.md),
[Teachers](../2026-10-18-teachers/README.md),
[academic structure](../2026-10-18-academic-structure/README.md) and
[learning](../2026-10-18-learning/README.md) reports. Their original counts
describe historical executions and are preserved. This is a focused component
recheck, not a repeat of all mutations, role checks or complete feature cases.

The independent exam date-label comparison, native browser 200% zoom, empty
calendar month and fee-year matrix were still open at this checkpoint. The
subsequent [remaining read checks](../2026-10-18-remaining-read-checks/README.md)
close those specific development gaps. Other feature/delivery checks remain
open. Production checkboxes are unchanged. No commit, push,
package publication or deployment is performed by this batch.
