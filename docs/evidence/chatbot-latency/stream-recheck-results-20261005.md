# French wording and concurrency-4 recheck — 2026-10-05

**Observed selected-key increases: $0.000874260 for six focused replies and
$0.012767300 for the 60-request load repeat; $0.013641560 combined.** These are
run-window increases, not daily bills or per-1,000 projections. Selected-key
equality was verified; other traffic, actual hosts and infrastructure remain
unallocated.

The French identifier hint passed six focused repeats and both lookup rows in
the later full batch. Level 4's first-text p95 was **1.854 s**, below the unchanged
8 s target. All 60 completed and correlated. The raw automatic result remains
**59/60**, with **60/60 assistant review**: a correct French greeting triggered
a language-scorer false positive. The original raw failure is retained, and the
prospective scorer fix has not had another paid run. No paid expansion/deployment
or production concurrency limit followed this allowance.

## Fixed source and conditions

The [plan](stream-recheck-plan-20261005.md) declared two stages, maximum 66 chats
and $0.35 in client estimates, with $0.01 per-in-flight reservations. The focused
stage's six chats/$0.10 estimate stop passed its wording/correlation/usage review
before the conditional level-4 stage's 60 chats/$0.25 estimate stop. Both request
allowances are consumed; the runner sent no extra paid probes, warmups, retries,
role chats or model comparison. Internal provider/SDK retries are not attributed.
The verified existing $50 total key limit is not a hard cap
matching either small run's estimate stop.

New [snapshot](stream-recheck-manifest-20261005.json) independently installed
published pins with the frozen lock. It includes the previously tested French
lookup hint and benchmark-only stream milestones, with GPT-OSS/Cerebras-first/
fallbacks allowed/Groq excluded/low reasoning and guarded templates unchanged.
[Readiness](stream-recheck-readiness-20261005.json),
[preflight](stream-recheck-preflight-20261005.json),
[fresh MCP/REST facts](stream-recheck-facts-20261005.json),
[corpus](stream-recheck-corpus-20261005.json),
[catalog](stream-recheck-endpoint-prices-20261005.json), and
[observed residency](stream-recheck-residency-20261005.json) were recorded.
No School academic data was created or edited.

The focused stage verified six fresh application-cache resets and six embedding
misses. The [load setup](stream4-setup-20261005.json) cleared caches once with no
chat active, then kept app instance/reset count 7 unchanged throughout overlap.
It observed 30 misses/30 hits, thirty completed local embedding attempts.
Initial history was empty. Conditions/percentiles are not pooled with each other
or with earlier serial/load batches; model/provider caches and hosts remain
uncontrolled. This is a closed bounded-worker workload, not a capacity/SLA test.

## Timing and investigation

| Stage/path | Replies | First-text p50/p95 | Completion p50/p95 |
|---|---:|---:|---:|
| Focused French lookup | 6 | 3.430 / 5.229 s | 4.302 / 7.791 s |
| Level 4, hybrid | 60 | 0.329 / 1.854 s | 0.329 / 1.879 s |
| Level 4, model | 12 | 1.201 / 2.296 s | 1.240 / 2.384 s |
| Level 4, template | 48 | 0.130 / 0.817 s | 0.130 / 0.817 s |

Client worker queue p50/p95 in the level-4 batch was 5.368/7.362 s, separate from
request latency and not measured provider queueing. It used 48 templates/12 model
replies, 18 generation steps and 48 guarded reads. All 66 requests had complete
correlated diagnostics and untruncated milestones; no duplicate IDs, missing
embedding spans, 429s, executed writes, fixture-fact/argument errors or promises.

The runner now records bounded client arrival milestones: stream and step
starts/ends, tool input/output, first non-empty text per step, final text time,
errors/aborts. Only type/time/step index is retained, no payloads or identities.
These signals include transport and SDK buffering. A `start-step` arrival is not
the start of provider generation; templates have no model-step marker.

[Focused arrival analysis](wording6-stage-analysis-20261005.json) locates
1.559–2.745 s between stream start and first tool-input signal, then 1.145–1.664 s
between tool output and first answer text. Actual School reads were 4.8–7.0 ms.
The first reply also took 2.507 s from first to last text. These measurements
show delay in multiple model/transport/stream portions, not a slow database read.

[Retrospective prior-run analysis](load4-stage-analysis-20261005.json) shows the
earlier slow French lookup reached School's tool at 6.148 s, read in 6.5 ms,
then waited about 1.377 s to first text. Current load arrivals are in the
[review](stream4-analysis-20261005.json). The repeat did not reproduce the prior
8.166 s hybrid first-text p95; it does not establish that concurrency or the
French wording hint caused the timing difference. The focused serial stage was
itself slower than the subsequent concurrent model subset. Do not claim a
latency fix, same-host comparison or production-safe concurrency.

Published Najm 3.3.0's matching read-only source shows diagnostics omit provider
generation IDs and metadata; its UI metadata contains cost only, and app config
offers no model/fetch instrumentation hook. OpenRouter's
[generation metadata API](https://openrouter.ai/docs/api/api-reference/generations/get-generation)
requires a generation ID and can report provider/latency/cost. A supported
published diagnostics extension remains needed for that attribution; no local
framework edits, global fetch patch, guessed IDs or credential-bearing capture
were introduced.

## Reply review and scorer defect

[Six-case raw](wording6-run-20261005.json) and
[assistant review](wording6-analysis-20261005.json): six successful empty search
arrays were described accurately in French, with no `student ID` label. The two
full-batch French lookups also used French identifiers, preserving stored names.

[Level-4 raw](stream4-run-20261005.json): `greeting-fr`, repetition 1, is valid
French, but `nombre` occurs twice. The old dictionary assigned it exclusively
to Spanish; the mixed-language heuristic therefore falsely rejected it.
Assistant review accepted all twelve model replies. All 48 template replies
exactly match the previously reviewed serial texts, with current guarded reads
and refreshed facts checked. Darija greetings retain minor money/fees and
upcoming-exam wording caveats; no native-fluency acceptance is claimed.

The prospective dictionary now treats `nombre` as shared French/Spanish
vocabulary. A targeted English `student ID` prose-label check also rejects that
short label even without two dictionary hits; exact stored names remain exempt.
The [separate offline language-only audit](stream4-language-audit-20261005.json)
changes exactly the false-positive greeting and still rejects the original
English-label failure. It does not rerun fact/argument scoring or overwrite any
raw report. Original automatic gates remain recorded as 59/60; there is no new
paid run of the corrected scorer or conditional paid expansion.

## Accounting and verification

| Measure | Focused six | Full level-4 repeat |
|---|---:|---:|
| Original automatic / assistant passes | 6 / 6 | 59 / 60 |
| Generation steps | 12 | 18 |
| Raw SDK estimate | $0.000980618 | $0.001565682 |
| Declared estimate | $0.008311850 | $0.013036100 |
| Later stable observed key increase | **$0.000874260** | **$0.012767300** |

The focused stage is model-only diagnostic coverage, not a hybrid-workload cost
gate. The full batch's declared estimate, including the flagged reply's spend,
projects $0.221 per 1,000 using the conservative 59 raw automatic passes,
below the unchanged $0.25 gate. It does not waive correctness/scoring conditions.
SDK metadata is not reliably host-aware: it exceeds this focused window's
observed increase but understates the full batch. Do not assume a fixed multiplier.

Immediate ledger zeros were stale. Focused later reads agreed for 52.5 seconds:
[later](wording6-later-20261005.json), [stable](wording6-settled-20261005.json).
Its delta differs from Cerebras catalog token math; actual hosts/native discounted
usage/billing delay remain unallocated. Full-batch [later](stream4-later-20261005.json)
was still partial; the file named [settled](stream4-settled-20261005.json) increased
again and is retained as an intermediate capture. The subsequent
[final read](stream4-final-ledger-20261005.json) agreed for 159.6 seconds and gives
$0.012767300, matching 33,598 input/1,344 output tokens at Cerebras catalog rates.
That consistency does not prove per-generation routing or invoice attribution.

Latest local benchmark/chat/read-only/year tests: **354 passed**, zero failures,
1,077 assertions across 24 files; lint passed. Before the paid stages, 353 tests
and frozen install passed. Prior source/test typechecks and isolated production
build cover the unchanged application/French hint; new changes are runner scripts
only, with focused parser/scorer/CLI tests. No extra production build is claimed.
[Post-run source check](stream-recheck-source-after-20261005.json) confirms the
frozen app remained unchanged; only the worktree's later scorer differs.

[Cleanup](stream-recheck-cleanup-20261005.json) stops the verified task-owned app
subtree and removes the temporary auth-header file; snapshot retained, unrelated
processes untouched. [Verification](stream-recheck-verification-20261005.json)
records current local checks and the distinct live/audited results.

Next work: finish role-run monetary stops and correlated diagnostics before
separately budgeted role/year acceptance; verify the prospective scorer under
explicit new conditions. Provider host attribution, failure/fallback/cancellation,
populated/held-out coverage and production/browser acceptance remain open.
