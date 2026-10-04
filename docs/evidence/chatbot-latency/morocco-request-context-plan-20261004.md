# Request-specific Moroccan replies — 2026-10-04

Fix the six remaining text defects from the previous Morocco run with the
current GPT-OSS 120B model. The context provider adds a request-specific Darija,
formal Arabic or French instruction with only that language's refusal example.
General upcoming-exam requests receive the next-five reminder; questions asking
for both counts receive the two-read reminder. Unknown languages retain the
existing system language policy. No translation/model call is added.

The stable prompt removes repeated cross-language examples. Retain existing
read-only enforcement, exact facts, year/actor context and knowledge tracing.
Local corpus classification, mixed-name, all-exams, counts and provider integration
tests run before paid requests. Official guidance favors concise, aligned
instructions and examples; this implementation is an inference to be evaluated,
not an official guarantee: [reasoning best practices](https://developers.openai.com/api/docs/guides/reasoning-best-practices).

Frozen checkout: `%TEMP%/school-morocco-request-context-20261004`, from current HEAD
plus the full captured tracked diff and required untracked source/test/fixture
files. Install published dependencies with `bun install --frozen-lockfile`, using
its own workspace links. Run Node Next at 3169 with separate development output
and opt-in benchmark controls. Other development apps are untouched.

First paid validation: all 30 frozen questions once, serial, fresh application
caches, retained answers and correlated model/embedding/server diagnostics.
Maximum 30 outer requests, $0.50 client-estimate stop, $0.01 reservation, no paid
warmups. If a correction is necessary, record it before a separate recheck of
at most 12 requests. This experiment's ceiling is 42 requests; historical runs
remain unchanged. Budgets are estimates rather than provider billing caps.

Shared DB/model settings are still shared across development apps. Do not start
paid requests while another model comparison is mutating settings; verify saved
OpenRouter GPT-OSS 120B before and after. No model-setting or school-domain writes
are part of this experiment. Refresh internal MCP/REST facts before measuring.

Compare quality and timings with the retained Morocco run, while recording that
the earlier run experienced concurrent source changes. Do not claim causal speed
improvement from that comparison. Accept no faster model while genuine factual,
language, register or write failures remain.

## Final localized attendance recheck, recorded before execution

All 30 replies completed with no fact, tool-argument, language or write failures.
The raw 29/30 register score missed `فهاد`; a regression-backed offline correction
accepts that genuine Darija wording and changes exactly one sample, to 30/30.
Preserve raw scores. Refusals are safe but too generic for the attendance request,
so attendance context now supplies an explicit unavailable-write explanation and
the attendance page in the selected language.

Run six cases once: the original Arabic/Darija attendance queries, one French
attendance query and the three unchanged next-five exam queries. Maximum six
additional requests, $0.15 estimate stop and $0.01 reservation. Total 36 requests
is within the declared 42 ceiling. Recheck only after updated local checks and
fresh process readiness; no model changes. Retain slower exam samples, including
French 37.036 s and Arabic 34.710 s from the full run.
