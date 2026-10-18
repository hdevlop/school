# Parents: first development browser batch

Target: **http://127.0.0.1:3102**, the existing dev demo and its local `school`
database. The owner explicitly authorized that target. The extra isolated
server initially started on port 3107 was stopped; the shared server was kept.
This batch triggered no production deployment.

The [before-fix probe](parent-card-before.json) confirms that all 16 visible
parent cards have English `View …` accessible names in the French interface.
`ParentCard.tsx` now uses the existing `common.view` translation. No catalog
change was needed.

The final [unmocked browser run](parents-results.json) has **20 PASS, 0 FAIL**,
with no unhandled page errors. It covers French card names, create cancellation,
French required-name validation, creation, reload, supported MCP value checks,
an unlinked/no-login parent, edit/reload with unrelated values preserved,
duplicate-CIN refusal, French phone cards, Arabic RTL and translated card names,
delete cancellation and confirmed deletion. The 409 response for the duplicate
is an expected negative. No email or phone was supplied and no parent account was created.

The [independent residue read](parent-residue.json) finds zero run-owned parents.
No existing person's data was changed. The two earlier browser-harness attempts
also removed their exact created parent. [Attempts](browser-attempts.json) retain
their failures and explain the corrections; their intermediate assertions are
excluded from the final count. Browser contexts were closed.

[Validation](validation.json) records the working-tree fingerprint, checks and
limitations. The existing Finance edits were preserved. This is dev acceptance
of the exercised journey, including `parents-M03`; parent/child attachment and
the full duplicate/ownership matrix remain open. The production checklist and
its 54/225 total are unchanged. Production build/release and live retesting are
pending the completed batch, following the [dev workflow](../../../tests/development-browser.md).
