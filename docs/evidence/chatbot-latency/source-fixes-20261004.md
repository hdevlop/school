# Darija routing and benchmark scoring fixes — 2026-10-04

Source changes and offline regression checks only. No chat-provider request,
embedding request, model switch, database migration or deployment was performed.
Earlier 50/50 reports predate the stricter scoring and changed prompt.

## Problems reproduced

- `عَلِّمْ ياسين غايب` kept the vowelled marking verb instead of rewriting it
  to `سجل`; attached `و` also discarded the shadda needed to distinguish
  marking from `علم` (science).
- `شْحال من تلميذ` became `كم من تلميذ`, missing the measured count phrase
  `كم عدد`. Two added Darija regressions failed before the fix.
- The completed-write scorer accepted a conditional French offer to enter a
  grade later; the adapter cannot fulfill that offer. It also missed plain
  English past-tense claims such as “I created”.
- Fact substrings could accept `1000` for the fixture's count of `100`.
  Required tool arguments were not checked, and inconclusive language could
  receive an automatic pass.

## Changes

- Darija rewriting matches known phrases with vowel marks and preserves marking
  shadda when processing attached conjunctions. Unknown names/MSA words stay
  unchanged. Prefix processing is iterative with bounded dictionary lookups.
- The read-only prompt forbids promises to write later and asking for a name,
  ID or confirmation to perform a write.
- `findWritePromise` detects future offers in English, French, Spanish, Arabic
  and Darija, including conditional offers. Refusals, dashboard instructions
  and offers to add detail to the answer remain allowed. This is a heuristic,
  not a semantic guarantee; live human review remains necessary.
- `chatbot-scoring.mjs` validates fixtures and checks successful tool groups,
  required argument subsets, required/forbidden facts with numeric boundaries,
  language, false completed-write claims and future promises. Inconclusive
  language and missing blocked-write server evidence require review and fail
  automatic acceptance. A language-neutral fixture can explicitly opt out.
- All five missing-student fixtures now require `search_search_students` with
  the correct `q`, replacing the full-list alternative.
- Tool inputs are captured only for in-memory scoring and stripped from saved
  tool reports. Argument mismatches and forbidden facts report fixture indices
  instead of private values. Summaries count promises, uncertain language and
  argument failures separately.

## Verification

- Focused claims/scoring/stream/language/Darija suite: **120 passed, 0 failed**.
- `bun scripts/chatbot-benchmark.mjs --validate`: **50 valid cases**.
- `bun run lint`, `bun run typecheck`, `bun run test`: passed. Final focused
  checks cover the later plain-past-tense and answer-detail refinements.
- `bun run build`: passed (captured exit code 0); compilation, type validation,
  page generation and final route output completed.

Remaining: a budgeted live run with the new prompt, rewrite and scorer; broader
fixture facts/roles/knowledge; shared embedding diagnostics and controlled
cache/concurrency acceptance. No latency or billing improvement is claimed
from these offline checks.
