# Jev native intake preparation — 2026-10-05

The next held-out collection now has an offline check/review/export workflow.
**Actual native-authored questions and human reviews supplied: zero.** The empty
template stays blocked; Jev remains off and the completed core accuracy failure
remains recorded. This follow-up made no live provider, ledger, School app, tool
or database request.

## Implemented

- [Empty template](../../../datasets/chatbot-latency/jev-native-intake.example.json)
  with author, native-speaker declaration, reviewer, UTC timestamps, blind-review
  and anonymization fields. `caseTemplate` is a guide, never a counted case.
- [Offline CLI](../../../scripts/chatbot-jev-native-intake.mjs): inspect drafts,
  create a blind worksheet or export a reviewed held-out corpus. Output creation
  is exclusive and does not overwrite existing records.
- [Collection checks](../../../scripts/chatbot-jev-native.mjs): agreed independent
  reviewer records, declared blind review, author/time records, anonymization,
  canonical freshness, family dev/test separation, consistent reviewed labels
  and collection coverage. Reviewed assistant-origin text cannot count as native
  authorship or a human held-out case.
- Export retains the actual declared provenance, excludes dev rows and hashes
  cases, intake and the three currently registered spent corpora. Export needs
  150 reviewed supported families, 40 declared native Darija/Arabizi cases,
  30 write families per style and each supported intent plus model-path negatives.
- The probe validates native export hashes and collection checks before network
  calls. Intake, worksheets, unknown purposes and stripped-purpose human records
  are refused. Native source and collection summaries stay frozen on continuation.
- A numerical native classifier gate stays separate from production acceptance,
  which remains false. This preparation does not change wording v3 or threshold
  0.8, relabel the old failure or add runtime integration.

## Verification

`bun run test:boundaries`: **301 passed, 0 failed, 1,207 assertions**; workspace
boundaries passed. `bun run lint`: passed. Mocked native CLI tests block every
fetch, including during export and subsequent probe validation; fixtures are
explicitly synthetic unit data and are not counted as collected human evidence.

The [actual empty-template check](jev-native-empty-check-20261005.json) exits 1
with zero cases, zero reviewed/native cases and `readyForExport: false`.
All four historical raw core reports retain their hashes; all 310 normalized
decisions replay unchanged, and the API request still matches frozen wording v3.
[Verification metadata](jev-native-intake-verification-20261005.json).

No production build was needed for these script/test/dataset/documentation
changes. No published package, app configuration or runtime enablement changed.

## Human input still needed

Use the [collection workflow](../../tests/jev-native-validation.md). Actual
anonymized Darija/Arabizi questions and review records must come from humans.
The source question requested a small first batch; none has been supplied yet.
Author/reviewer identities, native fluency, family relationships, semantic
freshness and true review independence remain human declarations requiring audit.
The tool does not authenticate these facts or guarantee future model accuracy.

Before later studies, register newly spent native corpora in the freshness set.
A reviewed export still needs a new explicit request/budget plan and subsequent
classification results; it does not replenish the exhausted 312-attempt study
or satisfy the B1–B4 runtime, reply, role, authorization and data-handling gates.
