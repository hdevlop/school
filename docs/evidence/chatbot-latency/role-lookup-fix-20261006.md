# Failed student lookup and role scoring fix — 2026-10-06

The [live role smoke](role-live-results-20261006.md) passed its old automatic
checks but failed assistant review: a Darija reply asserted empty attendance
after a scoped student lookup returned no match. Its parent names reply also
attempted a finance-profile tool that was denied, while the UI stream presented
the denial as a tool-output event.

School's global prompt and attendance hint now tie emptiness to the tool that
actually read the records. An empty student search establishes no attendance,
grade or fee result. The model is told to report the scoped lookup failure,
avoid inventing dates and avoid guessed/other-person IDs. A parent names-only
question uses the already authorized child list rather than the finance profile.
No permission, ownership or year predicate was changed.

The role scorer now rejects the saved Darija wording under its confirmed
empty-search contract. It correlates tool calls by ID and name with executed
terminal diagnostics. Missing matching search evidence, or an additional
attendance read whose applicability is uncertain, requires review and prevents
an automatic pass. Honest scoped not-found replies and genuinely empty
attendance reads remain separate cases.

Role measurement snapshots retain payload-free terminal tool names, call IDs,
outcomes and durations. Reports count terminal errors/blocks and show warnings
alongside UI-stream outcomes. A denied tool can coexist with a correct reply
from authorized context; it remains visible as a tool error rather than being
silently relabeled successful. Diagnostic tool capture is required before
pricing/accepting a measured attempt. The published nullable call-ID contract
is retained, without using null IDs as matching execution evidence.

Verification includes the real role stream/parser/scorer path, the exact saved
anonymized Darija wording, five-language negative examples, scoped refusals,
call-ID mismatches, malformed outputs, uncertainty and a UI-output/terminal-error
regression. The old wire body was not saved; the retained sentence is paired
with a reconstructed confirmed empty-search contract, not presented as a new
wire replay. Mock CLI tests block all network access.

[Verification and source hashes](role-lookup-fix-verification-20261006.json)
record offline tests, lint, types and the isolated production build. Earlier
raw paid reports and their 10/10 automatic versus 9/10 reviewed results are
unchanged. This work made no paid provider calls or key-ledger reads, performed
no live School-tool operations or school-record mutations, and supplied no
additional paid slots.

Prompt guidance and finite wording heuristics do not establish model behavior,
native fluency, exhaustive claim detection or production acceptance. A fresh,
separately budgeted live recheck remains before claiming the response defect is
resolved end to end. Jev stays off and its native/accuracy gates remain open.
