# Native review integrity — 2026-10-06

Reviewed question text could previously be edited while the intake still counted
its old review. A focused regression reproduced this: an otherwise complete
synthetic fixture remained export-ready after its text changed.

Reviews now carry a SHA-256 fingerprint of the exact question and collection
context. Text, language, family, split, source, author and anonymization edits
invalidate the binding. Labels, review declarations and model scores are excluded
from the fingerprint and blind worksheet.

Version 2 worksheets support a checked `--import-review` into a new intake file.
The importer validates the original collection, worksheet bindings, complete ID
coverage and allowed fields. Agreed imports require an independent declared
reviewer, timestamp and blind-review declaration. Pending rows preserve their
original records; conflicting completed reviews and existing output files cannot
be overwritten. Input and worksheet hashes accompany the imported intake.

Follow the [collection workflow](../../tests/jev-native-validation.md). Legacy
unbound worksheets need a fresh worksheet and bound review before export.

Verification:

- The new stale-text test failed before the fix and passes afterward.
- Focused native tests: **17 passed, 120 assertions**. CLI tests block every fetch
  and cover import, stale/edited worksheets, duplicate IDs, existing output,
  unchanged input and incomplete export.
- `bun run test:boundaries`: **313 passed, 0 failed, 1,336 assertions**;
  workspace boundaries passed for 1,275 files and 288 client entries.
- `bun run lint` passed. The empty intake check exits 1 as expected: zero actual
  human questions or reviews, with export blocked.
- Original Stage A, B0 and all four raw core reports retain their recorded hashes.
- Task files pass `git diff --check`. The whole-workspace check flags unrelated
  trailing whitespace in `PaymentsTable.tsx:91`; that payment work is unchanged.

[Machine-readable verification](jev-native-review-binding-verification-20261006.json)
records source hashes and checks. No provider, billing-ledger, School tool or
database calls were made. This change is offline collection tooling; Jev remains
off, and the earlier accuracy failures remain.

Fingerprints detect accidental record edits. They do not authenticate people,
native fluency, honest blind-review declarations or label correctness. Unit-test
fixtures are synthetic and do not count as collected evidence. Actual native
questions and independent human review still precede a fresh accuracy study;
runtime and end-to-end gates remain afterward.
