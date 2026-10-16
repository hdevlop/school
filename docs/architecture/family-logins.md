# School records and family logins

A student or guardian can be registered before they have a personal email or
phone. The record then has no user account. Enrollment, parent links, fees,
attendance, editing, deletion and photos do not require a student login.

Enter a student's own contact details only when they need their own login.
Guardian contacts belong to the guardian record. When real contact details
are added to a record without an account, its normal edit provisions a pending
account with the matching student or parent role. Existing account edits retain
Najm's email/phone identity requirements.

The parent account links to every child through `student_parents`. Imports reuse
a parent by CIN, phone or email. Identifiers pointing to different parents are
rejected; a name alone never merges people. A guardian with no contact is retained
without a login and can be completed later.

## Spreadsheet import

The Students importer reads `guardianName`, `guardianPhone`, `guardianPhone2`,
`guardianEmail`, `guardianCin` and `guardianRelationship` into one nested parent.
The second phone is used when the first is blank. A blank relationship defaults
to `guardian`. Invalid supplied details are reported before any create requests.
Guardian contacts are never copied to the student's own login fields. Student
creation, enrollment and parent linking share the existing transaction boundary.

When every server create fails, the import dialog stays open with the error.
Successful imports refresh Students, Parents and Users.

## Parent password handover

Import does not issue passwords. An administrator uses the existing Users-table
**Reset access** action. For a parent without an email, that action activates the
pending account and requires a new password at first sign-in. It uses a valid
CIN already on file, or generates an unpredictable temporary password when no
CIN is recorded. A malformed supplied CIN still refuses the action.

Only a newly generated password is returned for private handover, displayed once
in the reset dialog. A CIN is never returned. Neither credential is written into
the audit, and the existing permission, target checks, cooldown, transaction,
session revocation and mandatory password-setup protections remain in force.

## Migration and verification

Apply migration `0068_optional_family_logins` before running this version.
Student and parent user links become nullable; deleting a login retains the
school record. Independent image columns preserve photos without accounts,
including a backfill of existing images. No existing login is removed.

Focused service tests are in `packages/server/tests/security/FamilyRecords.test.ts`.
The database acceptance test uses only the guarded local `school_history_test`
fixture and rolls all test records back:

```powershell
bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/FamilyRecordsDatabase.test.ts
```
