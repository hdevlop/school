# Pinned Crusoe versus Cerebras — 2026-10-05

**Crusoe is cheaper, but was slower in this School workload.** Both providers
passed 60/60 automatic checks and assistant reviews. Nominal catalog-token
estimates for sixty replies were **$0.012706550 Cerebras / $0.002020800 Crusoe**,
84.10% lower for Crusoe. These are estimates from recorded usage under strict
routing, not isolated provider invoices or daily bills. The key was shared with
a separate Jev probe; the combined window reconciles with both costs, but its
whole increase is not this provider comparison's spend.

For the twelve model replies per provider, average completion was **1.318 s
Cerebras / 3.306 s Crusoe** (2.51 times slower). Templates averaged about 0.24 s
on both and make up 80% of this corpus. Keep the current Cerebras preference
unchanged for responsiveness; Crusoe remains a measured cost candidate with a
latency tradeoff. No deployment/default change, CoreWeave test or extra paid stage.

## Conditions and limits

The [plan](provider-compare-plan-20261005.md) declared four blocks of thirty
questions in **Cerebras A1 → Crusoe B1 → Crusoe B2 → Cerebras A2** order. Each
had a 30-chat/$0.125 client-estimate allowance and $0.01 per-request reservation;
all 120 outer chats consumed, maximum combined estimates $0.50. There were no
extra runner-triggered paid probes/warmups/retries. Hidden provider/SDK attempts
remain unallocated. Existing selected-key identity/$50 total cap verified; no
hard billing cap matching these small allowances claimed.

Two [frozen snapshots](provider-compare-manifest-20261005.json) independently
installed the same published lock/pins. Only the provider routing object differs:
`order` and `only` select one provider, fallbacks disabled, Groq ignored,
`require_parameters: true`. Same GPT-OSS-120b, low reasoning, latest French hint,
corrected shared-word/English-label scorer, templates, tool caps, guards, year,
private environment, saved model/key and database. No shared settings mutation.
This is a strict-provider comparison, not a live test of production failover.

[Readiness](provider-compare-readiness-20261005.json): shared source/parity,
354 prior tests/1,077 assertions and lint valid for unchanged application/runner;
both experimental route configurations passed source and test typechecks.
[Cerebras preflight](provider-cerebras-preflight-20261005.json) and
[Crusoe preflight](provider-crusoe-preflight-20261005.json) verified health, same
saved model/key and distinct app/cache instances, ports 3102/3103.
[Residency](provider-compare-residency-20261005.json) observed local Qwen; no model
unload or inference warmup. [Facts](provider-compare-facts-20261005.json) came from
internal MCP/REST; [corpus](provider-compare-corpus-20261005.json) frozen from them.
No School academic records created/edited; chat sessions are the expected writes.

Every chat used a new session, serial workers and verified fresh application
caches: 120/120 fresh misses, completed local embedding attempts and complete
correlated request/embedding diagnostics; no missing spans/IDs, truncations,
429s, writes/leaks/promises or fixture fact/argument failures. Source and
instance/reset records retained. Provider prompt caches/regions remain uncontrolled.
The first chat on each dev app is included; there was no paid warmup.

This block crossover is not request-level interleaving or production capacity
evidence. Same-provider sixty-row totals below describe its two identical declared
serial/fresh repeats. Do not pool the providers, old concurrent conditions or
model/template subsets; show each block and the twelve-row model subset. Small
samples do not establish production/per-language p95 or native fluency.

## Timings

| Provider/path | Replies | Mean first text | Mean completion | Completion p50/p95 |
|---|---:|---:|---:|---:|
| Cerebras, hybrid | 60 | 0.449 s | 0.458 s | 0.230 / 1.308 s |
| Crusoe, hybrid | 60 | 0.762 s | 0.853 s | 0.224 / 3.829 s |
| Cerebras, model | 12 | 1.277 s | **1.318 s** | 1.134 / 3.142 s |
| Crusoe, model | 12 | 2.851 s | **3.306 s** | 2.068 / 9.269 s |
| Cerebras, template | 48 | 0.242 s | 0.243 s | 0.216 / 0.417 s |
| Crusoe, template | 48 | 0.239 s | 0.239 s | 0.215 / 0.416 s |

| Block | Automatic/review | Hybrid first-text/completion p95 |
|---|---:|---:|
| Cerebras A1 | 30/30 | 1.252 / 1.308 s |
| Crusoe B1 | 30/30 | 1.877 / 2.107 s |
| Crusoe B2 | 30/30 | 5.291 / 5.381 s |
| Cerebras A2 | 30/30 | 1.706 / 1.714 s |

Both meet the predeclared hybrid p95 gates (8 s first text/15 s completion),
correctness/read-only checks and $0.25/1,000 correct-reply estimated API cost.
Crusoe exceeds the value candidate's 50% cost-reduction threshold. This does
not make it faster or production accepted: its **model-only first-text p95
8.846 s** and completion p95 9.269 s expose a tail hidden by the template mix.
The twelve-row p95 is effectively the worst observation, not a reliable SLA.

Crusoe B1's French missing-student lookup completed in 6.482 s: stream start
251 ms, first tool signal 3.181 s, result 3.245 s, first text 6.459 s. The School
read took 5.2 ms. Both model/transport portions contribute to that wait. B2's
Arabic lookup took 9.269 s; Cerebras's slowest lookup took 3.142 s. Public table
median latency/throughput do not predict School's complete two-step answer.
No provider queue/retry/region causality or permanent speed fix is established.

## Correctness and evidence

Each block's six model replies was reviewed for language/register, help or empty
lookup outcome, synthetic name, selected year, no invented records/write promises.
All 96 template replies exactly match the already reviewed serial template texts,
with fresh scoped reads and current facts checked. French identifier labels passed
without English `student ID`; the prospective corrected scorer now has live
120/120 evidence on this corpus. Earlier raw 59/60 scorer/label failures remain.

Minor wording caveats remain: Darija lookup/greeting choices are awkward in some
rows; Crusoe B2's French greeting contains a literal `\u0027` apostrophe escape.
These are retained readability/native-fluency limits, not rescored away. No
independent native-speaker, held-out, populated attendance or role/year acceptance.

- A1: [raw](provider-cerebras-a1-run-20261005.json), [review](provider-cerebras-a1-analysis-20261005.json).
- B1: [raw](provider-crusoe-b1-run-20261005.json), [review](provider-crusoe-b1-analysis-20261005.json).
- B2: [raw](provider-crusoe-b2-run-20261005.json), [review](provider-crusoe-b2-analysis-20261005.json).
- A2: [raw](provider-cerebras-a2-run-20261005.json), [review](provider-cerebras-a2-analysis-20261005.json).

[Aggregate analysis](provider-compare-analysis-20261005.json) records per-block
and same-provider means/percentiles, checks, usage and reset conditions. Aggregate
means exclude the client's wait for a worker and do not measure browser rendering.

## Price and ledger attribution

[Fresh endpoints](provider-compare-endpoints-20261005.json) advertise tools,
tool_choice and reasoning support for both. Strict-provider prices per million
input/output are [Cerebras $0.35/$0.75](provider-compare-cerebras-prices-20261005.json)
and [Crusoe $0.05/$0.25](provider-compare-crusoe-prices-20261005.json).
[OpenRouter routing documentation](https://openrouter.ai/docs/guides/routing/provider-selection)
supports the `only` restriction; source hashes/typechecks and matching published
Najm factory show these fields are forwarded. Actual generation IDs/invoice
metadata remain absent, so record intended strict routing rather than captured hosts.

| Measure for sixty replies | Cerebras | Crusoe |
|---|---:|---:|
| Input/output tokens | 33,598 / 1,263 | 33,586 / 1,366 |
| Recorded generation steps | 18 | 18 |
| Raw SDK estimate | $0.001550292 | $0.001569394 |
| Declared provider estimate | **$0.012706550** | **$0.002020800** |
| Declared projection per 1,000 accepted replies | $0.212 | $0.034 |

SDK prices are model-level and misrepresent the host cost comparison; retain
them unchanged. Nominal provider estimates include recorded failed-attempt usage
(none here), exclude unmeasured attempts/infrastructure and assume catalog rates.
The 84.10% saving applies to this token mix; no flat per-request price or production
mix guarantee. Templates generate zero model tokens but still consume chat slots
and local reads/embedding work.

[Accounting note](provider-compare-accounting-note-20261005.json): before new
chats, key usage was already $0.005184564 above the prior run's last observed read.
A1 later increases exceeded its own estimate. Reads eventually agreed before
each next paid block, but that agreement does not prove invoice settlement or
isolation. Keep delayed prior charges/other traffic/hidden attempts unallocated.
The user was asked whether this key is used elsewhere. Later workspace evidence
identified the separate [Jev classification probe](jev-probe-20261005.md), which
used the same environment key and overlapped A1. Its reported $0.014694750 plus
documented $0.000036246 smoke cost and this comparison's $0.014727350 estimate
sum to **$0.029458346**, exactly the observed increase from the Jev pre-run
baseline $0.792264894 to the last comparison read $0.821723240. This reconciles
the full shared window in aggregate; it does not isolate per-provider invoices
or capture generation hosts/retries. Preserve Jev's independently recorded
window and all earlier read values; no retroactive allocation rewrites.
OpenRouter's [activity API](https://openrouter.ai/docs/api/api-reference/analytics/get-user-activity-grouped-by-endpoint)
requires a management key; none was supplied/created, and no such API call made.

B1/B2 later increases matched their declared costs, $0.001014900/$0.001005900;
this is consistency, not independent billing attribution. All before/after and
intermediate ledger reads are retained with the raw reports and block reviews.
[Final accounting](provider-compare-final-accounting-20261005.json) separates
the full observed key window from token-based comparison estimates.

## Completion and next decision

[Post-run source](provider-compare-source-after-20261005.json) matches both
manifests and the worktree except each expected experimental routing object.
[Cleanup](provider-compare-cleanup-20261005.json) verifies both task-owned apps
stopped, ports released and temporary auth headers removed; snapshots retained.
[Verification](provider-compare-verification-20261005.json) records live checks
and previously passed shared-source tests plus new variant typechecks/install.

The production Cerebras-first/fallbacks-enabled configuration remains unchanged.
For latency-sensitive chat, this experiment favors Cerebras. Crusoe is a cost
option if the measured model delay is acceptable, with separate held-out/role/load
and fallback acceptance still needed. CoreWeave/DeepInfra are untested candidates;
any next paid comparison needs its own recorded allowance. All 120 slots here are
consumed; no automatic expansion or deployment.
