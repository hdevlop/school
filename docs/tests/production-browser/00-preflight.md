# Production browser preflight

Status: **NOT RUN**. Applies to every feature guide.

## Target and evidence

- Confirm exactly `https://myscolai.com`, valid TLS, intended full serving SHA from `/deployment-revision.txt`, successful `/login` and `/api/health/status`. Record statuses and SHA only. Readiness alone is not browser acceptance or schema proof.
- Obtain deployment evidence that the intended revision is the sole healthy app revision. A revision response alone cannot establish every replica; record this limitation if operational evidence is unavailable.
- Record source/test SHA separately from serving SHA. A documentation-only commit may legitimately differ. Stop an attempt if the serving revision changes.
- Record browser/version, viewport, locale, role, named tester and exact case selection. Start with authentication; retain local Gate A/A-R prerequisites for promotion.
- Use existing controlled acceptance accounts and supported, run-owned fixtures. Never use a real family/staff account for recovery, lockout, financial or destructive tests.

## Fixture ownership and mutations

Reading this folder does not execute or authorize production writes. At execution, record the authorized case scope, fixture ownership and supported cleanup before submitting mutations. An already-authorized fixture scope does not need repeated confirmation.

Read-only cases can inspect forms and cancel dialogs. Mutation cases apply only to the exact owned records. Use existing academic lookup data read-only where possible. For data setup/inspection by agents, follow repository guidance: internal Najm MCP first, supported internal REST when required; browser actions here exercise the product interaction being accepted.

Never run SQL, migrations, seeds, reset commands, Docker/Dokploy mutations or production clock changes during a browser attempt. Never rerun the partial data reset described in [the incident record](../seed-reset-routine.md) as test setup. Financial posting, school-wide settings, rollover and mail/push to real recipients require their own concrete scope; if a disposable/controlled scope is unavailable, mark those cases BLOCKED and use an isolated environment.

Maintain an in-memory fixture manifest of exact created IDs and relationships. Cleanup uses supported product/API actions in reverse dependency order, scoped to that manifest; never delete by a broad name prefix alone. Verify cleanup after success or failure. Record counts and remaining fixture labels only. If a posted financial record cannot be safely removed/reversed, establish an approved retention/reversal plan before creating it.

## Browser attempt

- Keep one serial attempt, isolated browser contexts for identities and zero automatic retries. Reuse one authenticated context within a dependent flow to avoid refresh races.
- Follow the retained [coder/tester handoff](reference/execution-contract.md): the tester receives an immutable candidate, observes one attempt, records failures and returns them to the coder without fixing or redeploying during that attempt.
- Observe page errors, console errors, failed requests and unexpected HTTP errors from page creation. Register expected negative requests by exact method, path and status for one action; other errors fail the attempt.
- Use actual deployed responses, semantic controls and visible readiness. Do not mock responses, clear cookies to simulate logout, force clicks or add arbitrary sleeps.
- After an authorized save, reload/reopen and check persisted effects; a toast is insufficient. Compare supported reads where needed, recording only sanitized outcomes.
- On failure, record a value-free fingerprint and stop that attempt. A new attempt needs a changed implementation or diagnostic hypothesis and fresh handoff; do not silently retry.

## Evidence privacy

Default screenshots, video, traces and raw HAR/body capture to off, as required by the retained remote contract. Use them only under an agreed redaction policy. Keep credentials, cookies, tokens, generated identities, CIN, mail links, financial/personal data and connection values out of committed evidence. Refer to fixtures by labels such as student-A. Do not paste secret values from browser storage or network tools.

Finish with [the evidence ledger](evidence-ledger.md). A case without fixtures or a UI surface is BLOCKED or NOT RUN, never PASS.
