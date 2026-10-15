# Controlled production security checks

Status: **NOT RUN**. Target: **https://myscolai.com**.

[Execution order](execution-plan.md) · [Preflight](00-preflight.md) ·
[Authentication](authentication.md) · [Evidence ledger](evidence-ledger.md)

This is a bounded application security checklist using owned accounts and
fixtures. Categories follow the versioned
[OWASP Web Security Testing Guide v4.2](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/),
particularly authentication, authorization, sessions, validation and business
logic. The limited checks below are tailored to School; they do not constitute
the full OWASP testing program or prove the absence of vulnerabilities.

## Scope and sequence

Start with signed-out behavior and the existing controlled admin account. Set up
only the minimum additional owned identities after the write prerequisites in
the execution plan. Finish cross-owner cases once people/relationships exist.
Run serially, stopping the attempt on an unexpected disclosure or mutation.

Do not run automated scanners, broad crawling, credential guessing, password
spraying, rate-limit floods, denial-of-service, destructive injection or public
infrastructure probes. No enumeration of real student IDs, receipts or files.
Use only known IDs belonging to this run; retain at most a sanitized result when
a denial fails. Browser diagnostics cannot establish host/database security.

## Cases

| Case | Controlled test | Expected result / evidence |
| --- | --- | --- |
| security-R01 | Open protected pages and known owned detail/file URLs signed out. Observe their corresponding application requests. | No sensitive response or cached protected view. Public landing/auth endpoints remain accessible as designed. Record page result and actual request denial separately. |
| security-R02 | As parent-A/student-A/teacher-A, open student-B and other owned-but-unrelated profile, fee, document and roster URLs. Repeat searches and nested views. | Effective ownership applies to protected list, count, detail and nested data; no private fixture-B values leak. A hidden row alone is insufficient. Evaluate file serving separately under security-M04's documented policy. |
| security-R03 | As a role denied administration/finance, navigate directly to `/users`, `/roles`, `/permissions`, `/settings`, `/payroll`, `/expenses` and `/financial-operations` as applicable to grants. | Server-side access enforcement and denied underlying data requests; no restricted page flash or write side effect. Allowed shared pages continue working. |
| security-R04 | Observe login, refresh, logout, multi-tab and revoked-session behavior from AUTH-03 through AUTH-06. Inspect cookie metadata and browser diagnostics without extracting values. | Cookie flags/path/domain follow the serving auth contract; secrets stay out of URLs, rendered errors and diagnostics. Logout/revocation cannot be undone by an overlapping response. Document token-storage exposure only from observed/source evidence. |
| security-R05 | Compare one owned nonexistent mailbox alias with one owned existing account for login/recovery; inspect redirect targets and reset-page behavior. | No actionable account/secret leakage or external redirect. Expired/used reset links cannot replace credentials. Cap wrong-password attempts at three per account and recovery sends at two per disposable account; leave threshold exhaustion to isolation. |
| security-R06 | Inspect HTTPS/mixed content, observed security headers, framing policy and redirects on login and authenticated pages. | Record concrete transport/framing defects and missing defenses against the intended policy. A missing header alone is not proof of exploitability; do not claim a full TLS/server audit. |
| security-R07 | In owned search/text fields, use a short apostrophe and inert markup text; save only to a disposable fixture where allowed. Reopen list/detail/print views. | Data is handled as text without broken queries, server traces or unintended DOM markup. Do not execute scripts, access cookies, send callbacks, or inject content into shared announcements. This checks escaping, not exhaustive injection resistance. |
| security-R08 | Open an invalid but correctly shaped owned/nonexistent ID and submit invalid supported form values. | Predictable 400/422/403/404 as appropriate, no 500, SQL details, stack trace, environment values or partial write. Define the expected status from the serving contract before the action. |
| security-M01 | On a disposable owned profile, try the supported account/profile controls as a lower-privilege actor. Separately test extra role/status/owner/year/processed-by fields through a scoped supported transport case if the UI cannot express them. | Actor, role grants, ownership, workflow and academic-year selection cannot be elevated or overridden by client fields. Record API tests separately; a hidden control is only UI evidence. |
| security-M02 | For one reversible owned update, test cookie-authenticated cross-site submission from an explicitly controlled test origin; inspect CORS behavior with and without credentials. | The cross-site request is rejected or lacks usable authentication, with no side effect; an unapproved origin cannot read credentialed data. A CORS block alone does not prove CSRF protection. If a helper origin/browser capability is unavailable, mark BLOCKED and retain an isolated transport test. |
| security-M03 | Upload a small nonsensitive allowed image through the actual form, reload, replace it, and attempt a small disallowed file type. Inspect management access as admin and denied identity. | Allowed upload persists, validation rejects disallowed content without orphans, anonymous serving is denied and management follows admin policy. Do not upload executable files, oversized flood payloads or traversal probes on production. |
| security-M04 | Compare authenticated access to a known owned fixture file from an unrelated context against the documented storage policy. | Report exact policy and observed access. Current source permits signed-in file serving and admin-only management; do not falsely assert per-owner file privacy. If private documents require narrower access, log the policy gap for review. |
| security-M05 | Attempt a denied owned-fixture change, cancel one destructive dialog and execute one authorized fixture deletion. | Denied/cancelled actions leave state unchanged, authorized deletion is constrained to the exact fixture, and stale tabs cannot overwrite unrelated records. No bulk-delete-all. |
| security-M06 | In finance, try invalid allocation/precision/status/date/deduction input and one deliberate duplicate submission under Phase E. | No unauthorized money change, workflow bypass, duplicate receipt/credit spend or negative-net payout; audit and independent balances reconcile. Concurrent replay proof remains a separate isolated API/database case. |

For REST/MCP parity, retain separate role/ownership assertions against the same
known fixture IDs where the feature exposes those transports. An agent/chat tool
must not bypass the policy already tested through the browser. General test-data
operations follow internal MCP-first/REST rules; no token is copied into evidence.

## Gate and finding format

An expected denied action passes only if the response is denied **and** the
fixture state is unchanged. An unauthenticated redirect cannot prove a signed-in
role's authorization. A 404 masking an unauthorized object is acceptable only
when that is the documented contract and discloses no data.

Record case ID, serving SHA, role, fixture alias, request method/path template,
expected/actual status, visible outcome and sanitized state check. On failure add
severity, minimal reproduction, affected boundary, practical impact, owner and
retest case. Never retain the leaked response or secret in a committed artifact.

Authentication bypass, unauthorized data access/write, session compromise and
privilege escalation stop the run's mutations. Financial-integrity failures stop
posting. Routine failures stop the current attempt under the shared zero-retry
contract; resolve scope/revision/diagnostic changes before a new attempt. Keep
blocked and untested checks open in the ledger. Security acceptance requires
runtime evidence on the tested release, not a clean source review alone.
