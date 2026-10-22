# Consumer browser report follow-up

Follow-up on October 22, 2026 (Africa/Casablanca) to the October 21–22 local
School consumer browser report. The original 90-case ledger remains historical;
this follow-up does not replace it with a new browser acceptance run.

## Corrections

| Original cases | Cause | Correction |
| --- | --- | --- |
| 39 | Assignment dates return as `null` from persistence, but the staff wizard accepted only strings or missing values. | Accept null optional dates, notes and section references in persisted assignments. The profile can be edited while its assignment remains open-ended. |
| 38, 50 | Details reused cards whose `NSectionInfo` fields truncate strings. | Details explicitly enable full contact values and subject descriptions, with wrapping for narrow dialogs. List cards retain their compact presentation. |
| 43 | CRUD uses its first query key as the fallback translation namespace; `staff-roles` differs from the catalog's `staffRoles`. | Use `staffRoles` as the mutation namespace and keep invalidating the existing full and active role queries. Creation, update and deactivation share this correction. |
| 70 | The student list returns yearly enrollment status, but the filter used the legacy student profile status tuple. | Build filter choices from `STUDENT_YEAR_ENROLLMENT_STATUS_VALUES`, including Withdrawn. |
| 14, 19, 29 | Resend rejected the synthetic recipient addresses. | Correct the mail test fixtures as described below; retain truthful delivery warnings in the application. |

## Invitation diagnosis and corrected test fixtures

Read-only Resend API checks confirmed that credentials are accepted and the
configured sender domain is verified. The three original invitation requests
were identified by their QA recipient labels in provider logs:

| Fixture | Request time (UTC, October 21) | Provider result |
| --- | --- | --- |
| Parent | 20:38:42 | HTTP 422, `validation_error`, reserved example recipient rejected |
| Student | 20:40:20 | HTTP 422, `validation_error`, reserved example recipient rejected |
| Teacher | 20:42:39 | HTTP 422, `validation_error`, reserved example recipient rejected |

The provider explicitly requested its testing addresses instead of `example.com`.
These failures were test-fixture errors, not evidence of a broken invitation
implementation or missing email credentials.

For a future provider simulation, use unique labels such as
`delivered+school-parent-<run>@resend.dev`,
`delivered+school-student-<run>@resend.dev`, and
`delivered+school-teacher-<run>@resend.dev`. Resend documents these labeled
[test recipients](https://resend.com/docs/dashboard/emails/send-test-emails).
This proves only the provider's simulated delivery behavior. Inbox receipt,
activation links and first login require an explicitly controlled real mailbox.
Never record a token, password or message body in evidence.

No email was sent and no live app records were created or modified during this
diagnosis. The local Najm Auth reference checkout is 6.6.0, whereas School pins
6.9.0; it was not treated as proof of School's installed runtime behavior.

## Verification

- Focused staff-schema, invitation-notice and enrollment-schema tests: 19 passed.
  The new regression edits salary/name with null assignment dates and notes for
  five staff roles, preserves those nulls, and continues to reject malformed dates.
- Dashboard/contracts configuration suite (`bun run test:config`): 600 passed.
- Root type checking: passed for contracts, server, server tests, seed and dashboard.
- Root lint: passed with one existing `ParentsTable.tsx` hook-dependency warning.
- i18n scan: passed. The enrollment filter and all three job-title success labels
  were also resolved against English, French, Arabic and Spanish catalogs.
- Production build: passed in the isolated `.next-consumer-fixes` output
  directory, preserving the running development server's output. The existing
  Najm Chatbot RAG-import deprecation notice remains.
- Browser verification of the corrected dialogs, role toasts and student filter:
  not rerun in this follow-up.
- Export contents, import round trip and native print acceptance remain outside
  these reported-failure fixes.
