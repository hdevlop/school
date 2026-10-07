# Jev language and readiness follow-up — 2026-10-05

The language-gate defect is fixed in School's supported reply-policy callback.
The fallback scheduling ambiguity is fixed in the target design, with a tested
offline reference. **The runtime race is not implemented or enabled.** B0 failed
its accuracy gate, and the published `najm-chatbot@3.3.0` still has a synchronous
post-routing template hook. No new paid calls or framework edits were made.

## School language selection

[`schoolReplyLanguage`](../../../packages/server/src/modules/chat/schoolReplyLanguage.ts)
is the single profile used by config, context hints and probe candidate accounting.
It adds clear French question/command openings to the published Moroccan profile,
including the reviewed `Tu peux…`, `On a combien…`, `Qui est absent…` and
`C'est quand…` requests. A clear command language takes precedence over foreign
names and quoted bodies. Arabizi additions require a command/question opening and
another distinct Darija signal; one name, repeated keyword or shared word is
insufficient. Unknown languages continue through the model path.

English/Spanish, quoted French commands, names and lookalike prefixes are covered
by negative tests. The Spanish `Marque` command is not a French signal without a
French complement. Existing qualified read requests still use the model/tools;
language selection alone never maps a read or authorizes a write. Existing guards,
year scope and the single Najm tool executor remain in place.

The probe uses actual query detection for regex/candidate counting. It still
classifies the full synthetic corpus for Stage A statistics. Its new
`testAfterLanguageGate` and `testAfterLanguageAndRegexGate` summaries are potential
first-turn candidate projections; they do not measure live role/history checks,
readiness losses, tool execution or answer precision.

## Readiness contract

[Plan 9.3](../../../CHATBOT-LATENCY-PLAN.md#93-target-design) checks the synchronous
regex before launching expensive preparation. Eligible misses start routing and
Jev together. Routing readiness selects the model immediately with **zero deliberate
grace**. An earlier accepted candidate selects the template. A candidate's null,
error or deadline removes only that candidate; routing keeps progressing. Client
cancellation aborts both jobs. Selection is sealed, so losing/late results cannot
execute duplicate reads or produce a second answer.

The [offline reference](../../../scripts/chatbot-reply-readiness.mjs) starts the
model at **50 ms** in the original 50 ms routing / 800 ms Jev example: no 750 ms
wait. Twelve virtual-clock tests also cover cache hits, declines, synchronous
throws, timeouts, cancellation and unabortable losing rejections. These tests
validate the proposed selection protocol, not measured runtime latency. Fast
routing will win more often; B3 must measure the resulting Jev coverage loss.

The upstream contract must account for every started embedding/API attempt before
closing capture: cancelled/unused/partial outcomes, correct request IDs and no late
mutation of a settled record. Unknown/truncated history is ineligible; only an
authoritative `priorUserTurns === 0` qualifies. Initial scope is administrator web
chat. Actual abort propagation and terminal diagnostics still need upstream tests.

## Replay and verification

[Normalized-record replay](jev-language-replay-20261005.json) used retained
hash-matched corpus text for both original reports and preserved **1,491 decisions**.

| Potential new accepted cases after actual language and regex gates | Before | After | Wrong cases after |
|---|---:|---:|---:|
| Original Stage A test | 21 | 29 | 0 |
| B0 test | 100 | 127 | 1 |

The original Stage A recognized-language queries are now covered; **11 B0 Arabizi
queries remain unknown**. B0 still fails its predeclared accuracy gate. This replay
does not create fresh held-out evidence or establish 98% precision. Classifier
wording, thresholds and the original paid reports were preserved.

Verification: 171 chat tests / 472 assertions; 266 script tests / 995
assertions plus workspace boundaries; lint, typecheck and build pass. The full root test
command passes 330 config tests, then stops at `ServerMessages.test.ts` on four
existing literal errors in `ChatBenchmarkService.ts`. That file matches the
pre-existing provider-comparison snapshot hash and was not edited by this fix.
An initial build hit malformed generated Next types after concurrent typegen/build;
the sequential rebuild regenerated them and passed. Details are recorded in
[verification](jev-language-readiness-verification-20261005.json).

Later [benchmark i18n follow-up](benchmark-i18n-fix-20261005.md): the four literal
errors were replaced with request-language translations and the full root test
suite now passes 1,446 tests. The preceding failure describes the earlier state.

The runtime change requires a supported published upgrade after B0 passes.
[AGENTS.md](../../../AGENTS.md#local-najm-package-sources) requires: “The Desktop
checkouts are **read-only** reference.” The [najm skill](../../../.agents/skills/najm/SKILL.md)
states: “School upgrades only by pinning a published version.” The matching
Desktop sources (`najm-chatbot` 3.3.0 / `najm-rag` 3.2.0) were used only as references.
