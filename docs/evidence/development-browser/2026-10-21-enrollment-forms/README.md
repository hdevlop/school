# Enrollment and teacher form corrections

Development verification on 2026-10-21 at `http://localhost:3102`, based on
`3aa3ca1693353387ba685e211e68fcdd86526527` plus uncommitted changes. Tester:
Codex with standalone Playwright and Chrome 155.0.8059.86. Implementation
file hashes are retained in [source-fingerprint.json](source-fingerprint.json). Selected academic
year: 2026-2027. Desktop: 1440 × 1000; phone: 390 × 844.

The preceding production inspection on `https://myscolai.com` reproduced
the fee preview, teacher validation and layout problems on that same base
revision. This development report does not accept the changes in production.

## Observed results

| Case | Result |
| --- | --- |
| New student, October 21 admission, tuition 2,000/month | PASS: Fees previews 18,000, matching the nine-month October–June billing period. No student or fee was saved. |
| Change admission to November 21 through Previous/Next | PASS: entered tuition remains 2,000 and the preview changes to 16,000. Clicking the uncompleted Fees header does not navigate; that was a test assumption, not a product failure. |
| Empty school | PASS with a local browser response fixture for an empty class list: the dialog explains that a class and section are needed and its Manage classes action navigates to `/classes`. No school data was removed. |
| Class without sections | PASS with a local browser response fixture: selecting the class shows the Academic → Sections setup guidance. No academic records were changed. |
| Failed class lookup | PASS with an intentional local 500 response: an error notice appears and no empty-school dialog opens. The fixture was removed afterward. |
| Class Level | PASS: its label has the required marker and blank submission shows validation feedback. No class was saved. |
| Section Room Number | PASS: optional blank remains valid while other required fields fail; its control is numeric and the placeholder is `e.g., 101`. No section was saved. |
| Teacher Email | PASS: new-teacher Email has a required marker and blank input fails inline. The API returns 400 before creating records. Existing phone-only profiles remain supported by the edit schema. |
| Teacher layout | PASS: field positions relative to the form stay unchanged after validation, including Email. Checked English desktop/phone and Arabic phone, with no horizontal overflow. Arabic validation was activated by keyboard because the development-only Next.js badge overlapped the footer. |
| Invitation delivery | PASS: one development teacher was created through internal MCP using Resend's delivery simulator, without a supplied password. The real invitation flow returned `emailSent: true`; Resend reported `delivered`. Cleanup through internal MCP removed the exact teacher, linked staff member and login; subsequent supported reads returned 404 for all three. |
| Failed-invitation recovery | PASS in the focused notice test: a failed send produces a warning with the supplied Reset access action, does not report success and does not retry automatically. The teacher table binds the action to the created account, subject to reset permission. Provider failure followed by a real retry was not exercised. |

No unhandled page errors were observed. No screenshots, sessions, credentials,
activation links or raw personal-data responses are retained here. Setup
response fixtures were limited to the local browser; production responses were
not mocked.

## Mail diagnosis and limits

Production app and worker use Resend with a configured key. The sender domain
was verified, the app container could reach the provider, and a message with
no account data sent from that container to Resend's simulator was delivered.
The application log retained the original invitation failure but not the
provider's reason, so the cause of that earlier failure is not established.
No production account was created or changed, no invitation was resent to an
existing recipient, and no production mail configuration was changed.

The simulator is documented at <https://resend.dev/>. Simulator delivery proves
the exercised transport and invitation flow; it does not establish delivery
to the original placeholder address or a real teacher's mailbox.

## Verification

- PASS: 60 focused dashboard tests across six files.
- PASS: 30 teacher-dashboard server tests, including five new activation checks.
- PASS: 19 server localization tests.
- PASS: 28 package and workspace boundary tests.
- PASS: root lint and typecheck.
- PASS: final configuration suite, 571 tests across 79 files.
- PASS: translation-key check in all four locales.
- PASS: optimized production build with TypeScript and all 13 static pages,
  using the isolated `.next-form-review` output. The final build after the
  encoding-only translation repairs also passed.

The changing shared checkout caused two intermediate global failures: the
assessment default-marks test during its concurrent edit, and encoding damage
in newly added translations. The assessment test was corrected by that work.
Only damaged translation text was repaired in this batch, retaining the
concurrent feature behavior. The final configuration suite passes.

Assessment, grades, dashboard and offline-plan behavior edits belong to
concurrent work in this shared checkout and were preserved. No commit, push or deployment was
performed for this batch.
