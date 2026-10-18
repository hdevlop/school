# Historical defect: Previous discards the current step's draft

**Development follow-up:** the published Najm Kit 3.6.3 fix passes the
[School recheck](../2026-10-18-shared-ui-recheck/README.md), including invalid
drafts, header navigation and assignment arrays. The reproduction below
records the earlier 3.6.1 failure; production acceptance remains separate.

Target: `http://127.0.0.1:3102/teachers`, French, `najm-kit@3.6.1`.
The pinned package version matches its read-only Desktop checkout.

Open Create, complete Personal information and press Next. Enter salary 3000,
specialization and years of experience on Professional information, then press
Previous before advancing to Assignments. Personal information remains. Press
Next again: salary is blank and the other unsaved professional values reset.
The final [creation report](teachers-create.json) retains this assertion as
**FAIL**, refills the lost fields and completes creation successfully.

The matching Najm source is
`src/components/form/multi-step/MultiStepForm.tsx`. Next submits the current
step into `useFormSubmission`'s existing form-data ref. Previous directly calls
`nav.handlePrevious`; the step-change effect resets the form from that ref,
without first saving the current values. The same transition risk needs review
for header-based step navigation.

The [Najm skill](../../../../.agents/skills/najm/SKILL.md) explicitly says
“Najm source is read-only reference” and “never make School consume the local
source; School pins published versions.” This run therefore leaves the package
source and dependency pins unchanged. A published shared fix is needed.

Save raw draft values into the existing wizard owner before Previous or direct
step navigation, including invalid and partially completed inputs. Do not
require a valid current step to go back. Preserve completed-step validation and
final schema checks, and test both draft restoration and final submission with
text, number, optional and repeating-array fields. Verify French/Arabic and
phone dialogs, then adopt the published version and rerun this reproduction.
