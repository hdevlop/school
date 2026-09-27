> Preserved reference from the retired root acceptance plan. This text is retained verbatim below for traceability, including its old status, section numbers, paths and commands. It is not a current execution result. Use the [production browser index](../README.md), [preflight](../00-preflight.md) and [current runner status](../automation-and-release.md) before execution. Local/database obligations remain open; production smoke does not satisfy them.

## 6. Gate A — dedicated auth lifecycle

Auth is a separate serial suite. It must not select any feature spec.

Planned exact titles:

```text
school auth 01 - anonymous routing and safe redirect contract
school auth 02 - Admin session login logout and relogin
school auth 03 - Remember Me session and persistent lifetimes
school auth 04 - credential setup completion and fresh login
school auth 05 - credential setup cancellation expiry and replay denial
school auth 06 - password recovery and account invite token lifecycle
school auth 07 - role isolation across all seeded login roles
school auth 08 - cross-tab logout propagation
school auth 09 - protected-request and logout overlap has no late session writer
school auth diagnostics - final cookie writer and network assertions
```

Discovery-only listing must report exactly **10 tests in one file**.

Each applicable lifecycle must prove:

- no recognized auth cookie before login;
- one exact hydrated `POST /api/auth/login` result;
- the correct role surface and one protected read succeed;
- wrong-password and inactive/locked/revoked boundaries return exact statuses;
- unsafe `from` values cannot target auth, API, Next.js or static routes;
- one real UI logout produces one exact successful `POST /api/auth/logout`;
- navigation reaches `/login`;
- access, refresh, signed-session and remember cookies follow the selected
  lifetime and are absent after logout;
- the role's protected endpoint is denied after logout;
- different contexts do not share auth state;
- no response writes a signed session after the logout deletion.

Credential setup must additionally prove:

- setup login issues no authenticated session;
- only the standard setup status/change/cancel endpoints are used;
- weak, mismatched, expired, cancelled, consumed and replayed setup is denied;
- a valid replacement consumes setup once and requires a fresh login;
- the temporary credential is rejected after completion.

Password recovery and account invitation must additionally prove:

- the forgot-password response does not disclose whether an identity exists;
- exactly one message for the namespaced identity is captured without live
  delivery, and its link uses the expected loopback origin;
- missing, malformed, expired, cancelled, consumed and replayed tokens fail;
- weak and mismatched replacement passwords fail before token consumption;
- a valid token is consumed once, the old password is rejected and the new
  password requires a fresh login;
- the account-invite path uses the same supported reset endpoint without
  creating an authenticated session before completion.
- adding an ignored `identifier` field cannot change or reset the email-owned
  forgot-password rate-limit bucket;
- exactly one of two concurrent valid reset submissions consumes the token.

Session revocation must additionally prove:

- a revoked refresh family is refused by refresh, cookie recovery and bearer
  verification;
- an unknown family after cache loss fails closed instead of resurrecting an
  authenticated session;
- a successful login creates the positive live-family marker required by both
  cookie and bearer verification.

Role isolation must cover every seeded login role: `admin`, `principal`,
`accounting`, `teacher`, `student`, `parent`, `counselor`, `nurse`, `secretary`,
`librarian`, `driver` and `assistant`. For each role, derive the expected
landing route and allowed/denied protected reads from the committed seed grants;
do not guess permissions from a role name or accept a hidden navigation item as
authorization evidence.

Cleanup is not a selectable Playwright test. Runner `finally` cleanup and
`globalTeardown` must execute after pass, failure, timeout or interruption, close
every owned context/process and delete only the exact local run namespace. The
passive diagnostics test is the tenth discovered test and never mutates state.

Gate A passes only when all ten tests, runner-owned teardown, supported cleanup,
artifact audit and local repository gates pass together. Only then may feature
groups start.

## 6.1 Gate A-R — administrative access reset from the Users table

Status: **not executed.** The implementation is in source and passes the local
source gates; no connected run has been performed. This section states what a
connected run must prove, not what it has proved.

Gate A-R runs after Gate A and before any feature group. It is serial, admin-only
and must not select any feature spec.

Planned exact titles:

```text
school access-reset 01 - active parent CIN credential setup and forced replacement
school access-reset 02 - parent replay denial and prior session revocation
school access-reset 03 - active student and teacher reset email single delivery
school access-reset 04 - pending invitation resend creates no second user or profile
school access-reset 05 - denial matrix refuses unsupported account classes
school access-reset 06 - stale confirmation refusal after the account changes
school access-reset 07 - per-target cooldown across two administrators
school access-reset 08 - desktop row, card and keyboard reach one same action
school access-reset 09 - Arabic RTL and narrow-viewport confirmation
school access-reset diagnostics - no credential, CIN, token or link in any surface
```

Discovery-only listing must report exactly **10 tests in one file**.

Each applicable journey must prove:

- exactly one `POST /api/admin/access/users/:userId/reset-access` per confirm;
- a non-admin principal receives the guard's refusal and no mail leaves;
- an active parent with a valid stored CIN signs in with email + CIN, is routed
  to `/change-password`, cannot skip it, and signs in with the new password
  afterwards — the CIN no longer works once replaced;
- sessions the parent held before the reset are dead immediately after it;
- an active student, teacher and login-enabled staff member each receive exactly
  one reset mail in the local mailbox, and their existing sessions stay valid
  until the new password is saved;
- a pending account's resend produces one mail and leaves the `users`,
  `students`, `parents`, `staff` and `teachers` row counts unchanged;
- every refused class — self, administrator target, inactive, unknown role,
  profileless account, parent without a valid CIN, orphaned teacher/staff chain,
  terminated staff — returns its safe status and produces no mail, no credential
  change and no success audit row;
- a confirmation raised before the account changed is refused with `409` and the
  list refreshes, so the next confirmation is built from the account as it is;
- two administrators clicking the same target inside the cooldown produce one
  effect and one refusal;
- the action is reachable from the desktop row menu, the card menu and the
  keyboard, and reads correctly in Arabic RTL at a narrow viewport;
- a console/memory transport is reported as simulated and never as delivery, and
  a refused send keeps the dialog open and is retryable.

Fixture contract: every account this gate touches is created by the gate inside
its own run namespace and deleted by runner-owned teardown. It must never target
a seeded demo account it did not create, and never a live account.

Evidence rules: no credential, CIN, token, reset link, email body or audit
metadata value may appear in any recorded artifact. Audit assertions record only
that a row exists with the expected actor, target, mode and outcome.
