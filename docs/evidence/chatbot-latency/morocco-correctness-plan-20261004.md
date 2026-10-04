# Moroccan correctness checks — 2026-10-04

User authorized stronger factual/language checks, local verification first,
then current-model corpus and a faster candidate. Scope is Darija, Arabic and
French. Keep saved `openrouter / openai/gpt-oss-120b`.

Freeze all ten existing scenarios per language (30 cases) using current internal
MCP/REST school facts, selected year 2026-2027. Require row-bound exam dates,
start/end times, class/section, next-five order/count, exact class section lists,
and detect inconsistent total/remaining count claims. Mask only exact stored
names for language checks; inspect tables, parentheses and list glosses. Flag
formal Arabic for Darija heuristically. Native-speaker quality remains unproven.

Local adversarial and prior-run regression tests must pass before paid requests.
Separate Node Next process at 3104, `.next-benchmark-morocco`, fresh application
caches and correlated diagnostics. Shared domain DB/settings, so no domain writes;
comparison temporarily changes model only and restores GPT-OSS. No shared-app restart.

First run: 30 cases twice, maximum 60 outer requests, serial, no paid warmups.
Client estimate stop $1, $0.01 reservation per request; no hard billing-cap claim.
Retain text and every failure. Any fixes receive separately recorded bounded
rechecks. Candidate comparison only after resolving current-model failures:
one pair per Moroccan case (maximum 60 additional requests), same checks/cache
conditions. Recheck route availability and prices before choosing a candidate.
No adoption based on speed alone. Keep raw runs and source/corpus/scoring hashes.

## Corrected snapshot / reply recheck, recorded before execution

The first 60-request run finished: all facts passed, 54/60 automatic checks.
The initial PowerShell capture corrupted accented French names; its exact
corpus/facts are retained under `morocco-initial-encoding-*`. Capture now
explicitly decodes UTF-8 and a mock REST/MCP regression checks both scripts.
No structural exam/class/count facts differed in the corrected snapshot.

Three initial language flags were detector gaps (short French introduction,
Darija `هادوما` twice). Two Darija class replies were codes-only and one
announcement refusal was formal Arabic; those prompt failures are addressed.
Raw scores are retained unchanged. The next run covers all 30 cases once,
using corrected names and the updated prompt/scorer: maximum 30 additional
requests, $1 estimate stop, $0.01 reservation, same fresh-cache conditions.
Total planned ceiling is now 150 (60 initial + 30 recheck + 60 paired route).

## Multi-count recheck, recorded before execution

Corrected run completed 29/30 replies: all language/register checks passed.
One exam footer said "after 23 October"; the count checker wrongly read 23 as
remaining exams. Date-without-year stripping and French/Darija regressions fix
that detector bug. One Darija multi-count sample read only student count then
finished with no visible text; server/stream record retained. Routing preview
confirms both read tools available in all three languages (zero paid chats).
The prompt now explicitly requires both reads and a visible sentence for every
part. This is a prompt mitigation, not a proven provider-empty recovery mechanism.

Rerun all 30 cases once after local tests, same $1/$0.01 limits. Revised total
ceiling: 180 (60 initial + 30 first recheck + 30 multi-count recheck + 60 paired
route). Previous failures will remain in the final report and cannot be erased
by a later passing sample. Candidate remains gated on the next current-model run.

## Concurrent edits / frozen checkout

While the multi-count run was in progress, unrelated academic-year/controller
and routing changes appeared in the shared working tree. Retain that run, but
do not use it as a frozen timing baseline. A separate worktree is created from
the first preflight's revision `36c05413e1cedbe439671d31a3c80d82cb8e327d`, with
the exact benchmark/prompt/checker files and previously present cache controls
copied in. Its own `bun install --frozen-lockfile` resolves published packages
and workspace links; no source or package link points at the changing checkout.
Its local env remains ignored. No domain DB changes.

Use the frozen app for one full 30-case current-model validation followed by
60 paired route requests, if validation passes. Revised outer ceiling: 210,
including the earlier 120 requests. Separate runs retain $1/$0.01 client limits.
The original live app's HMR errors are operational failures, not model failures;
no paid calls are sent for blocked preflights. Copy all frozen raw reports back
to the main evidence directory and retain source/scoring/corpus hashes.

Frozen API uses **3167**. Port 3105 was occupied by another app; the initial
read-only preflight there found disabled controls and sent zero paid chats.
3167 was checked free before startup, and its enabled-controls preflight passed.
Latest merged register checks include Darija negative forms (`كاينش`, `نقدرش`),
and the multi-count instruction now applies only when both counts are requested.
The frozen snapshot has its own hash manifest. No further workspace edits will
be copied into it during the measured run.

## Shared-model interruption

The frozen run stopped after six outer requests when another task's comparison
changed the shared AI setting to GPT-OSS Nitro. The first five default samples
passed; the sixth is a model mismatch with unresolved pricing, not a baseline
sample. This task has sent 126 requests in total and holds further paid calls
pending coordination. Raw frozen evidence is copied back to the repository.
The task-owned frozen server is stopped and its duplicate env file removed.
The results document retains this interruption and the separate completed
comparison without claiming current-model quality acceptance.
