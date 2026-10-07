# CoreWeave 20B and Jev-first comparison ? 2026-10-08

**The requested 96-chat experiment is complete. Jev-first with CoreWeave 20B has the best average time in this sample, but it does not pass the existing fallback regression gate.** Keep it an isolated experiment while fixing filtered-query ID lookup and narrowing eligibility. Normal chatbot routing remains unchanged; real-question Jev remains off.

## Full-chat measurements

24 identical synthetic cases per arm, French/Arabic/Darija, rotated arm order, concurrency one, no benchmark retries. Times start at POST /chat and finish when its stream closes. The averages and percentiles below include completed replies with tool failures. The usable column means completed, nonempty streams without tool errors; it is not a native-language quality score.

| Configuration | Mean total | Median | p95 | Without tool errors | Jev templates | Observed charges for 24 chats | Projected per 1,000 similar chats |
|---|---:|---:|---:|---:|---:|---|---:|
| 120B / Cerebras, Jev off | 0.867 s | 0.911 s | 1.468 s | 24/24 | 0 | $0.03025300 | $1.2605 |
| 20B / CoreWeave, Jev off | 1.382 s | 1.460 s | 2.081 s | 23/24 | 0 | $0.00280180 | $0.1167 |
| 20B / CoreWeave, parallel Jev | 1.485 s | 1.558 s | 2.539 s | 23/24 | 0 | $0.00358189 | $0.1492 |
| 20B / CoreWeave, Jev-first | 0.718 s | 0.386 s | 1.695 s | 24/24 | 15 | $0.00156571 known + one unreported failure | Incomplete |

Jev-first averages **718 ms**, about **17% faster than 120B** and **48% faster than CoreWeave 20B alone**. Its 15 selected Jev templates average **372 ms**. It uses 11 generation calls versus 42 for 20B alone. Parallel Jev selected no templates and added cost without a speed improvement.

CoreWeave 20B alone costs about **91% less** than this Cerebras baseline. The host is explicitly pinned with no fallback; all 94 captured 20B generation calls came from CoreWeave. All 41 baseline generation calls came from Cerebras. [Captured provider parameters/pricing](jev-coreweave-endpoints-20261008.json) come from the [official endpoint API](https://openrouter.ai/api/v1/models/openai/gpt-oss-20b/endpoints). Listed pricing is $0.03/$0.13 per million input/output tokens; the table uses actual response usage.cost, including failed answers and Jev, rather than SDK estimates.

Jev-first has one incomplete invoice: the failed Decisions call returned HTTP 529 without usage.cost. Its observed charge sum is a **lower bound**, not its complete total. No per-1,000 Jev-first cost is asserted. The whole experiment has **$0.03820240 in known response charges**, plus that unreported failure. Its $0.00015 reservation remains deducted from the continuation's spending allowance; a reservation is not proof of the final charge.

## Correctness and tradeoffs

- All 96 streams completed. Both 120B and the Jev-first arm had 24/24 streams without tool errors. The 20B off and parallel arms each had one tool failure on ar-filter. They passed a section name (CE2) as sections_get_students.id. The fixture has no CE2 section; listing/resolving actual IDs should precede such a read. Failures and their costs remain included.
- All 36 student/teacher/combined count replies contain the correct fixture counts: 8 students, 0 teachers. This checks those facts, not overall answer quality. One plain 20B Darija teacher reply leaked English ("The count is 0."), and its Arabic combined-count reply included a literal backslash-n. Native wording still needs review.
- 44 Decisions attempts: 43 successful cost-bearing responses, 41 provisional label matches, 15 selected templates, **zero accepted-wrong templates**, one 529 failure with unknown cost. Two nonmatching successful decisions were not executed. Classifier elapsed p95 is 435 ms. Only read tools or refusal/greeting replies executed; no mutating tool was invoked.
- Jev-first's p95 is **1.695 s**, versus **1.468 s** for 120B. Seven Jev-first requests fell back to generation. Six have successful same-case 20B-off counterparts; their paired fallback delta p95 is **+612 ms**, exceeding the existing +100 ms regression requirement. The 800 ms bounded wait is a real fallback tradeoff, not a passed readiness gate.

## Failure retention and limits

The [first run](jev-coreweave-first-run-20261008.json) stopped after four chats on the 529's missing cost and restored off/120B. Nothing was repeated. The [continuation](jev-coreweave-first-continuation-run-20261008.json) ran only the remaining 92 jobs in a fresh process, with at most 46 additional Decisions calls and a reduced combined estimated cap of **$0.247913686**. Known prior spend and the unknown reservation were carried; the original ledger stays preserved and unresolved. Another unknown cost would stop the continuation.

Combined dispatch is 96 chats and 44 Decisions attempts, below the original 96/48/$0.25 limits. The first process's failure and changed cache conditions are visible in the two segments. This continuation is a deliberate new reduced allowance, not a reset of the failed process or a general exception allowing missing costs to be zero.

[Recomputed JSON](jev-coreweave-first-results-20261008.json) matches all **135 generation calls**, with zero unaccounted IDs and zero provider-policy violations. It records actual usage, case-level replies, analyzer/input hashes, separate arm timing and incomplete costs. Both source-frozen protocols are retained: [original](jev-coreweave-first-plan-20261008.json), [continuation](jev-coreweave-first-continuation-plan-20261008.json). Raw billing captures are [prefix](jev-coreweave-first-generation-prefix-20261008.jsonl) and [continuation](jev-coreweave-first-generation-continuation-20261008.jsonl).

## Delivery and next action

Published/adopted [najm-chatbot 3.5.0](najm-chatbot-3.5.0-published-20261008.md) adds candidate-first to the existing selector; parallel remains the default. CoreWeave/first arms require marked local controls and one-use server-issued synthetic grants. The experiment adds no second scheduler, year resolver or tool executor.

Upstream 281 tests pass. School's 78 focused checks, 1,902 full test executions, lint, typecheck, boundaries and isolated production build pass. Later CLI-only continuation/report checks pass separately. [Cleanup](jev-coreweave-first-cleanup-20261008.json) verifies Jev off, 120B restored, API key removed and AI disabled in the fixture; port 3103 is stopped. Main port 3102 and the primary database were untouched.

**What we can do next:** keep the current 120B configuration for normal traffic. Fix name-to-ID resolution for filtered questions, skip classification for obviously unsupported filters, and measure first-path fallback latency again. Then use a small controlled pilot for supported read intents if the revised latency/quality gates pass. These assistant-authored 24 cases demonstrate integration behavior; they do not establish independent Darija accuracy, concurrent-load p95, or safe automatic production rollout.
