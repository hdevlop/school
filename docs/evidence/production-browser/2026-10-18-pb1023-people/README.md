# PB1023-PEOPLE: People checklists on the demo

Tested `https://myscolai.com` on 2026-10-18, 14:05 to 14:40 UTC, on
revision `7022277` (najm-kit 3.6.3, deploy run 39133452898). The served
`/deployment-revision.txt` matched throughout.

This is the production run of the people checklists that the 2026-10-18
development batches passed locally:
- [users](../../development-browser/2026-10-18-users/README.md)
- [students](../../development-browser/2026-10-18-students/README.md)
- [teachers](../../development-browser/2026-10-18-teachers/README.md)
- [staff](../../development-browser/2026-10-18-staff/README.md)
- [parents](../../development-browser/2026-10-18-parents/README.md)

It adds three checklists that no development batch covered: the student,
teacher and parent profiles, and registration.

Tester: Claude Code. Chrome 155 through Playwright, headless, French at
1440×900, with checks at 390×844 and in Arabic right-to-left. Each script
records its writes, page errors and HTTP errors. The deliberate refusals are
the only HTTP errors. No unhandled page error occurred.

## Fixes under test

The development batches left three shared Najm failures. All three pass here:

| Failure in development | Fixed in | Result on the demo |
| --- | --- | --- |
| A filter matching nothing left a blank card grid ("page 1 of 0") on users, staff and teachers | najm-kit 3.6.3 | Users, staff and teachers each show the translated no-results state, and clearing the filter restores the list |
| Previous discarded the unsaved values of the step being left in the teacher form | najm-kit 3.6.3 | Salary, specialization and experience are still there after Previous then Next |
| The class filter had no accessible name | najm-kit 3.6.2 | The students class filter is found by its name, "Filtrer par classe" |

## Scripts and data

The development scripts were reused unchanged in substance. Only these were
adapted for the demo:
- **Address and account.** The scripts target the demo origin and sign in as the demo administrator.
- **Year.** The active year is 2025-2026, not 2026-2027.
- **Mail.** Fixture addresses are `@school.test`, whose mail goes to the test mailbox.
- **Dates.** They fall inside 2025-2026. A helper steps the calendar to the month.
- **Remove buttons.** The remove label is matched in French ("Retirer …"); 3.6.2 localized it.
- **User list.** It is read page by page; the demo has 278 accounts, more than one page.

Every fixture is new, carries `PB1023` in its name or code, and was deleted
by the run. The final reads find no leftover user, student, teacher, staff
member, zone or parent.

Two read-shape issues in the scripts were not product failures:
- **students-create.** The script expected the fee list as an array, so it
  recorded "Nested fee mismatch". The response wraps the fees as
  `{ …, fees: [...] }` and holds the single registration fee of 50 MAD. That
  check is recorded as passing in students-verify-create.
- **Teacher fixture.** The PB1021 fixture teacher `ESmmt` no longer exists.
  The profile checks use the seeded teacher Loubna Qadiri and student Wahid
  Guessous.

## Results

| Case | Result | Evidence |
| --- | --- | --- |
| users-R01 | PASS: search by name and email, the read-only view of role and status, the French and Arabic phone cards, the no-match state, and 278 accounts paged 100, 100, 78 | [lifecycle](users-lifecycle-results.json), [paging](users-filter-results.json) |
| users-R02 | PASS: French required-field messages and no invitation; a duplicate email gets 409 and the dialog stays open | [lifecycle](users-lifecycle-results.json) |
| users-M01 | PASS: invite, edit the name, then inactive, pending and active, each reloaded; role and email unchanged | [lifecycle](users-lifecycle-results.json) |
| users-M02 | PASS: cancelling the delete sends nothing; confirming deletes and the account is gone after reload. A teacher account is refused every users route (18 checks) | [lifecycle](users-lifecycle-results.json), [access](users-access-results.json) |
| students-R01 | PASS: filters by name, code, class and section; the table and the French and Arabic phone cards show the same student; the class filter is reachable by its name | [read](students-read-results.json) |
| students-R02 | PASS: an empty first step and a whitespace code are refused; values survive going back from the parents step | [create](students-create-results.json) |
| students-M01 | PASS: three steps with a nested parent and a registration fee; one student, one parent and one fee of 50 MAD after reload | [create](students-create-results.json), [verify](students-verify-create-results.json) |
| students-M02 | PASS: the identity edit locks the yearly placement and keeps the dated history; the transfer closes the old placement on its date with the actor recorded and keeps the admission date. Avatar upload not included | [edit](students-edit-results.json) |
| students-M03 | PASS: cancelling the delete keeps the student. Empty and whitespace codes get 400 and duplicates 409, leaving no partial student or parent. A teacher account is refused (13 checks). The fee, the student and the parent are removed in order | [refusals](students-refusals-results.json), [access](students-access-results.json), [cleanup](students-cleanup-results.json) |
| teachers-R01 | PASS: filters, the no-match state, keyboard card navigation and French and Arabic phone details; assignments match the detail view | [read](teachers-read-results.json) |
| teachers-M01 | PASS: the empty step and a negative salary are refused, and the step-2 draft survives Previous. One teacher is created with its linked staff identity and salary, and the edit keeps the section and subject pairs | [create](teachers-create-results.json), [edit](teachers-edit-results.json) |
| teachers-M02 | PASS: bulk section assignment stores each pair once and matches the detail view after reload | [assignments](teachers-assignments-results.json) |
| teachers-M03 | PASS: deleting a teacher with live assignments gets 409 with translated guidance. Assignments are removed with the form's controls, then the teacher; a duplicate CIN and a teacher account are refused | [assignments](teachers-assignments-results.json), [refusals](teachers-refusals-results.json), [cleanup](teachers-cleanup-results.json) |
| staff-R01 | PASS: filters by category and name, the no-match state and clearing it; status and role shown on cards and in the table | [filters](staff-filter-results.json), [lifecycle](staff-lifecycle-results.json) |
| staff-R02 | PASS: the hourly, driver-licence and assignment controls follow the selected role | [role controls](staff-role-controls-results.json) |
| staff-M01 | PASS: an hourly staff member is created, edited and reloaded with its rate and hours; French and Arabic phone views | [lifecycle](staff-lifecycle-results.json) |
| staff-M02 | PASS: status changes; a monthly cleaner's zone assignment is ended before deletion. A teacher account is refused every staff route | [assignment](staff-assignment-results.json), [access](staff-access-results.json) |
| parents-R01 | PASS: search and details. An unlinked parent is marked orphaned, and a parent with a child shows no such mark and lists the child | [lifecycle](parents-lifecycle-results.json), [supplement](parents-supplement-results.json) |
| parents-M01 | PASS: create and edit an owned parent, reload. An owned child is attached through the student form and the link survives reload | [lifecycle](parents-lifecycle-results.json), [supplement](parents-supplement-results.json) |
| parents-M02 | PASS: duplicate CIN, phone and email each get 409 with their own French message and leave one parent. A student created with that parent's CIN is linked to the existing parent, with no second one | [lifecycle](parents-lifecycle-results.json), [supplement](parents-supplement-results.json) |
| student-profile-R01 | PASS: the row's "Voir" dialog and the direct URL show the same name, code, class CE6, section A and status | [profiles](profiles-results.json) |
| student-profile-R02 | PASS: all seven tabs render without a load failure; two parents, the attendance counts and the photo agree with the API | [profiles](profiles-results.json) |
| student-profile-R03 | PASS for fees: a fee row opens `/students/:id/fees` for the same student, from the list's dialog and, since `d9238ff`, from the `/students/:id` page. The Transport tab has no link to follow; it shows the same student's pickup | [profiles](profiles-results.json), [recheck](profile-fixes-results.json) |
| teacher-profile-R01 | PASS: all four tabs render; name, CIN, email, salary and nine classes agree with the API | [profiles](profiles-results.json) |
| teacher-profile-R02 | PASS: 2025-2026 has no class routines on the demo, so 2024-2025 was compared. Nine sections and 18 weekly lessons match the teacher's published routines | [profiles](profiles-results.json) |
| parent-profile-R01 | PASS: from the list and by URL, the same parent and child | [supplement](parents-supplement-results.json) |
| parent-profile-R02 | PASS: the Overview and Details tabs show children, a zero balance, CIN and email | [supplement](parents-supplement-results.json) |
| parent-profile-R03 | PASS: the child link opens the same student. A parent account linked to no family gets 404 for the parent, its children and the student, and its browser shows none of their fields | [supplement](parents-supplement-results.json) |
| registration-R01 | PASS: signed out, the French labels show and the login link opens `/login` | [registration](registration-results.json) |
| registration-R02 | PASS: empty, malformed-email, too-short, no-uppercase and mismatched passwords are refused in French before any request | [registration](registration-results.json) |
| registration-M01 | PASS: one registration returns to `/login` with the approval message. No session cookie, no role, status pending, email unverified | [registration](registration-results.json) |
| registration-M02 | PASS: a second registration gets 409 with feedback, and one account remains. The new account cannot sign in (403) | [registration](registration-results.json) |

## Findings

- **The login refusal for an account not yet approved is English.** A
  pending account gets "Account is inactive. Please contact support." The
  login page translates only 401 and 429, and School's catalog lacks
  najm-auth's `auth.errors.accountInactive`. 71 najm-auth message keys are
  missing from School's catalog and fall back to English, including:
  - `accountLocked` and `emailNotVerified`
  - `users.errors.phoneExists`
  - `roles.errors.roleInUse`
  - every `oauth*` and `credentialSetup*` message

  The wrong-password message is French because School defines that key.
  **Fixed in `6f1f20a`.** All 51 keys were added in the four languages, and a
  server i18n test now requires them. On the demo, a pending account's sign-in
  is refused in French, Arabic, Spanish and English, and the French login page
  shows it in French ([results](auth-i18n-results.json)).
- **Fee rows open a fee record only from the profile dialog.** On
  `/students/:id`, the Fees tab's rows are not clickable. **Fixed in
  `d9238ff`.** On the demo, a row on the page opens that student's fee
  record, and the list's dialog still closes before opening it
  ([results](profile-fixes-results.json)).
- **The transport start date is unformatted.** The Transport tab shows
  `2025-01-12`, where the other tabs use `01/09/2025`. **Fixed in
  `e6db5eb`.** On the demo, the start date reads `12/01/2025` and the tab
  shows no raw ISO date ([results](transport-dates-results.json)).
- **The not-found subtext offers a retry.** An unknown teacher's profile says
  "Enseignant introuvable", then "Cette liste n'a pas pu être chargée.
  Veuillez réessayer" with a Retry button. A retry cannot help a deleted
  record. **Fixed in `d9238ff`.** On the demo, the Overview and Details tabs
  of a missing teacher show only "Enseignant introuvable", with no retry; an
  existing teacher's profile is unchanged
  ([results](profile-fixes-results.json)).

## Environment note

On this machine, Bun 1.3.14 no longer completes Playwright's browser launch:
both Chrome and Playwright's own Chromium time out. Node 24 launches both in
under a second. The scripts ran under Node.
