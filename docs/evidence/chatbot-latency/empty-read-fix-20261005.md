# Successful empty attendance reads — 2026-10-05

The 60-request [repeat](current60-results-20261004.md) passed automatic checks but
assistant review found an Arabic reply claiming attendance was unavailable and
suggesting settings/retry advice after a successful empty read. This change adds
explicit School prompt guidance and a grounded benchmark regression check. This
local verification sent no paid requests. A subsequent [focused live check](empty-read-results-20261005.md)
passed 6/6 automatic and assistant reviews; the earlier 59/60 review remains unchanged.

## Product change

The system prompt now distinguishes successful `[]`/zero counts from actual
errors and authorization/year denials. It requires saying no records were found
for the requested date/year and forbids inferring that everyone was absent or
present. Settings/retry advice is reserved for an actual failure.

School's attendance request context supplies a localized empty-result example in
French, formal Arabic and Darija. Recognized writes still use the existing
read-only refusals. No new template, tool, controller, ownership/year boundary,
provider preference or package pin was introduced.

This is a prompt change, not a deterministic post-processing guarantee. The
model still generates attendance-read replies. The focused live check supplies
narrow regression evidence; full post-fix acceptance remains open.

## Benchmark change

The stream parser optionally decodes tool output arrays/JSON-as-text and retains
only `{ kind: "array", count }`, never names or row contents. Capture stays off
by default; the benchmark opts in. Unsupported shapes remain unknown.

Attendance cases name their `emptyResultTools`. With a successful matching server
read and observed zero-length array, scoring requires explicit empty-result
wording and rejects unavailable/settings/retry claims. Unknown shape or missing
execution evidence requires review rather than a pass. The policy does not
certify populated-row facts or every possible narrative inference; multilingual
wording checks remain heuristics and need reply review.

Moroccan corpus version 4 and legacy five-language version 3 include the new
policy; the generator preserves it. `chatbot-empty-reads.mjs` is included in
scoring hashes. Frozen historical corpora, raw benchmark replies and their scores
were not rewritten.

The regression test feeds the exact retained failing Arabic reply through the
real stream parser/scorer, paired with a synthetic `[]` event matching the
independently verified empty-read contract. It is not a recovered original
stream result: the previous runner did not retain result summaries. Honest empty
wording is covered in all five languages, including Darija variants; populated,
failed, unknown and blocked reads and redaction are covered separately.

## Validation

- Focused parser/scorer/context tests: 76 passed, zero failures.
- Benchmark/chat/read-only suite: 302 passed, zero failures, 856 assertions.
- Server source and test typechecks passed.
- Root lint passed.
- Default 30-case and legacy 50-case validation passed.
- `bun run build` — passed, using `NAJM_NEXT_DIST_DIR=.next-chat-empty-read-check` to isolate the verification output.

No paid chat, provider/key mutation, deployment or database migration was performed
for this fix. The $0.25 cost gate was retained; the weekly usage screenshot did
not authorize a new cost target or establish current per-answer billing.
