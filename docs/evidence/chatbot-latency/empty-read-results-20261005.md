# Focused empty-attendance live check — 2026-10-05

**Six of six automatic checks and six of six assistant reviews passed.** All
three languages, twice each, correctly reported no attendance records after a
successful empty read. No reply claimed an outage, suggested settings/retry
advice, inferred anyone's attendance status or promised a write.

This closes the narrow reproduction check for the previously observed wording
defect. It does not establish full post-fix corpus acceptance or guarantee future
model replies. Historical 60/60 automatic and 59/60 assistant results are unchanged.

## Run and review

Executed the [recorded six-request plan](empty-read-plan-20261005.md) once:
French, Arabic and Darija attendance-today cases, two repetitions, serial, new
sessions, warm resident Qwen embeddings and verified fresh application caches.
All six used GPT-OSS-120b through the model path; none used a reply template.
Cerebras-first/low reasoning policy was retained. Per-generation host is unknown.

The [raw report](empty-read-run-20261005.json), run `c26da96b`, records:

- Six completed, non-empty answers; six automatic passes; zero review-required,
  language/register, factual, argument, correlation or cache-verification errors.
- Six successful executions of `attendance_get_today_students`; each stream
  captured `{ "kind": "array", "count": 0 }`. Result rows and arguments are not saved.
- Six correlated, completed routing embedding misses/attempts and six fresh-cache
  resets on the same app instance; no incomplete diagnostic captures.
- Two provider-generation steps per answer (tool call, then reply); twelve steps
  overall. No additional paid probes, warmups, comparisons or retries were sent.
- Empty initial history on every request. Source/config/scorer hashes remained
  unchanged throughout the run.

[Assistant review](empty-read-analysis-20261005.json) covers every reply. Both
repetitions in each language gave the same wording:

| Language | Reply |
|---|---|
| French | Aucun enregistrement de présence ou d'absence n'a été trouvé pour cette date. |
| Arabic | لا توجد سجلات حضور أو غياب مسجلة لهذا التاريخ. |
| Darija | ما كاين حتى شي سجل ديال الحضور ولا الغياب فهاد التاريخ. |

Each is a no-records statement for the requested date in the selected-year
scope. None asserts that no pupils were absent or everyone was present. Review
is by the assistant, not independent native-speaker certification. Held-out
wording, populated attendance, actual errors and role/year denials still need
separate live coverage.

## Timing and cost

Completion ranged **0.860–1.718 s**. Descriptive nearest-rank completion
p50/p95: **1.026/1.718 s**; first-text p50/p95: **1.002/1.555 s**. With six
samples these are smoke timings, not a reliable production tail estimate or
proof of improvement over the previous workload. Do not pool the runs.

The six chats recorded 22,616 input and 427 output tokens. SDK aggregate estimate
was **$0.000963154**; budget settlement was $0.000963155 after rounding, with no
unknown costs or stop triggered against the new $0.10 estimated ceiling.

Observed environment-key usage increased from **$0.680154034** to
**$0.688389884**, a **$0.008235850** delta. This exactly matches the undiscounted
Cerebras catalog calculation for recorded tokens:
`22,616 × $0.35 / 1,000,000 + 427 × $0.75 / 1,000,000`.
That is a useful consistency check, not proof of selected-key identity,
per-generation host or fully attributed charges. The current SDK prices remain
$0.039/$0.19 per million tokens and are not host-aware; cached/reasoning usage
does not establish a billed discount.

A [later key read](empty-read-key-settled-20261005.json) returned the same usage;
this confirms stability at that read, not isolation of account traffic.

Attributing the entire delta to these six model-only replies would imply
**$1.37264/1,000 replies**. This focused workload has no templates and cannot
replace the previous hybrid cost figure. The unchanged **$0.25/1,000 correct
answers** gate remains open; the small absolute bill does not waive it. Local
embedding infrastructure costs and other account traffic are not reconciled.

## Preparation and cleanup

- [Frozen source](empty-read-manifest-20261005.json), independently installed
  with `bun install --frozen-lockfile`; 302 benchmark/chat/read-only tests passed,
  zero failures, 856 assertions. Focused three-case validation passed.
  [Verification summary](empty-read-verification-20261005.json) also records
  matching run/postflight corpus hashes, valid local links and whitespace checks.
- [Live preflight](empty-read-preflight-20261005.json) confirmed enabled saved
  GPT-OSS and supported cache controls; [internal attendance fact and live tool
  schemas](empty-read-attendance-fact-20261005.json) confirmed a successful empty
  result. [School facts](empty-read-school-facts-20261005.json) were captured by
  authorized internal MCP/REST reads; no attendance fixture was changed.
  The focused corpus received the fresh attendance fact timestamp/hash after
  preflight and before execution; the run and postflight record its final hash.
- [Postflight](empty-read-postflight-20261005.json) retained the provider/model
  and cache instance; [post-run source hashes](empty-read-source-after-20261005.json)
  matched the frozen manifest.
- [Key before](empty-read-key-before-20261005.json),
  [key after](empty-read-key-after-20261005.json),
  [current endpoint prices](empty-read-endpoint-prices-20261005.json).
- [Cleanup](empty-read-cleanup-20261005.json) verified launcher identity and
  stopped only the task-owned process tree. Port 3102 was no longer listening;
  Ollama and the frozen snapshot were retained. No deployment, provider/key
  mutation or database migration was performed.

The six-request allowance is consumed. The next full post-fix acceptance repeat
needs its own recorded limits; cost estimation/attribution should be addressed
before another model experiment.
