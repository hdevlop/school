# Chatbot latency and cost plan

Status: **CEREBRAS-FIRST GPT-OSS AND SHARED MOROCCAN REPLY POLICY ADOPTED; LATEST REVIEWED HYBRID RUN PASSES 30/30. REPEATED ACCEPTANCE, CURRENT BILLING, BROADER CORRECTNESS AND PRODUCTION/BROWSER VERIFICATION REMAIN. NEMOTRON REJECTED; JEV DEFERRED.**

## 0. Current status and next work — 2026-10-04

This section and sections 1–11 describe the current plan. The dated entries
below are experiment history; their package versions, pending work and provider
prices describe that run, not the current installation. Source/configuration
review does not establish the effective settings of a running deployment.

| Work | Current state | Evidence or remaining action |
|---|---|---|
| Published packages | Adopted | Current root pins: `najm-chatbot` 3.3.0, `najm-rag` 3.2.0, `najm-mcp` 2.2.5, `najm-api` 5.0.0; RAG/chatbot Desktop reference versions match; earlier releases below are dated history |
| Provider routing and reasoning | Configured; earlier serial run measured | OpenRouter `openai/gpt-oss-120b`, Cerebras first, fallbacks allowed, Groq excluded, reasoning effort low; [routing report](docs/evidence/chatbot-latency/step3-cerebras-low-20261004.md); actual host and fallback acceptance remain |
| MCP tool-name compatibility and index cleanup | Implemented; published RAG adopted | Prefix collisions removed; year inputs accept unused nulls; RAG 3.2.0 removes retired tool embeddings; [rename report](docs/evidence/chatbot-latency/cerebras-tool-prefix-20261004.md), [cleanup report](docs/evidence/chatbot-latency/step3-cerebras-low-20261004.md) |
| Latest-message language policy and School templates | Published and adopted; 30/30 reviewed | Najm owns opt-in language instructions and guarded template execution; School supplies unqualified count and write-refusal templates; [reply report](docs/evidence/chatbot-latency/najm-reply-results-20261004.md); qualified/unrecognized requests retain the model path |
| Streaming runner and School diagnostics | Implemented; local traces captured | `scripts/chatbot-benchmark.mjs`, admin-only in-memory diagnostics; embedding-call/attempt spans and all-outcome summaries available |
| Embedding diagnostics | Published and adopted; serial live correlation verified | 100/100 complete correlated traces; request-scoped cache/attempt/timing/outcome records; live concurrent acceptance remains; [release review](docs/evidence/chatbot-latency/embedding-diagnostics-20261004.md) |
| Concurrent benchmark runner | Implemented; mocked CLI checks pass | Bounded workers 1/2/4, chat/embedding ID validation and load summaries; [runner review](docs/evidence/chatbot-latency/concurrent-runner-20261004.md); controlled live traffic still pending |
| Preflight and estimated-spend stop | Latest isolated preflight ready; paid dispatch pending budget | Frozen published-dependency app at port 3102: health, saved GPT-OSS and cache controls verified; [run preparation](docs/evidence/chatbot-latency/current60-plan-20261004.md). Earlier [status refresh](docs/evidence/chatbot-latency/status-refresh-preflight-20261004.json) found no app there. SDK prices are not host-aware; existing key's $50 total cap is not a benchmark-sized cap |
| Application-cache controls | Implemented; 100/100 live samples verified | Opt-in dev/admin resets, matching instance/reset IDs and completed routing embedding misses/attempts; [cache review](docs/evidence/chatbot-latency/cache-controls-20261004.md); cold-model and provider-cache conditions remain uncontrolled |
| Read-only chat and argument schemas | Fixed; local checks pass | Confirmation-marked writes blocked; AI SDK `inputSchema`; [schema review](docs/evidence/chatbot-latency/tool-schemas-20261003.md) |
| Attendance refusal and concise exam replies | Implemented; latest Moroccan replies reviewed | Latest run: six template refusals and three model-generated exam answers passed; earlier 15/15 schedule review and median improvement remain dated evidence. [Latest](docs/evidence/chatbot-latency/najm-reply-results-20261004.md), [earlier](docs/evidence/chatbot-latency/reply-fixes-results-20261004.md) |
| Scoring, facts and Darija register | Implemented; latest Moroccan checks 30/30 | Per-row class/exam facts, argument boundaries, mixed-language/register checks and write promises; all latest replies reviewed, with wording caveats retained. [Latest review](docs/evidence/chatbot-latency/najm-reply-results-20261004.md); native fluency and held-out coverage remain |
| Reusable Darija rewriting | Published and adopted | `najm-rag@2.3.0` exports an opt-in factory; School retains domain vocabulary and literal rules; [migration review](docs/evidence/chatbot-latency/darija-shared-20261004.md), 109/109 output parity |
| Multilingual answers and routing | Latest coverage: Darija, Arabic, French | Default corpus `morocco.json`: 30 cases; current policy reviewed 10/10 per language. Legacy five-language evidence and core 18/20, Darija/French 30/31 routing previews predate current acceptance; English/Spanish and routing misses remain |
| Parent, teacher, student and follow-ups | Separate smoke checks: 10/10 | `scripts/chatbot-roles.mjs`; [role review](docs/evidence/chatbot-latency/roles-20261003.md); broader repeated coverage remains |
| Embedding availability and failure handling | Local fixes and outage checks complete | Queries 5 s, indexing 60 s, failure cooldown 30 s, router-error fallback `none`, Ollama residency; hanging requests and populated knowledge need controlled acceptance |
| Tool cap and context | Evaluated locally | Keep cap 12 / semantic hits 8; shorter prompt passes 50/50 and cuts input tokens 21%; one-run evidence |
| Faster model | Nemotron full-corpus comparison rejected | Final prompt, same 50 questions/checks per model: GPT-OSS 47/50, Nemotron 45/50; completion p50/p95 6.367/18.802 vs 2.105/5.000 s. Nemotron wrong/mixed language and invented exam count; estimated cost gate failed. [Results](docs/evidence/chatbot-latency/reply-fixes-results-20261004.md) |
| Repeated-call termination | Published and adopted; package tests | Chatbot 3.2.0 introduced termination after two identical tool-call steps; no live trigger in the routing run; verify termination and legitimate multi-step work separately |
| Acceptance baseline | Latest hybrid smoke passes; controlled acceptance incomplete | [Latest 30-case report](docs/evidence/chatbot-latency/najm-reply-results-20261004.md): completion 0.523/1.345 s p50/p95; model subset 0.951/1.584 s, templates 0.305/0.523 s. Earlier [100-request baseline](docs/evidence/chatbot-latency/default100-fresh-20261004.md) failed its gates and must not stand in for current behavior |
| Current cost gate | Unproven by invoice | Latest hybrid model-token estimate $0.003020093 for 30 replies; earlier Cerebras routing measured about $1.03/1,000 answers, above the $0.25 gate. Reconcile current hybrid spend, failures and embeddings; keep path estimates separate |
| Production and browser measurements | Unrun | Deployment revision, runtime connectivity/schema, production API and submit-to-render evidence |

Remaining work, in order:

The latest [shared-policy run](docs/evidence/chatbot-latency/najm-reply-results-20261004.md)
completed 30/30 original Moroccan cases with all replies reviewed, correlated
diagnostics and verified fresh application caches. Fifteen replies were templates
and fifteen used GPT-OSS. This is one serial admin run in an isolated development
checkout, not repeated acceptance or production evidence. It does not establish
native fluency, an interleaved speed improvement or current billed cost.

1. **Current-configuration acceptance:** freeze published pins, provider policy,
   corpus/scorer/template/context hashes, authoritative facts and history; repeat
   the serial warm-embedding/fresh-application-cache baseline against section 6.4.
   Report hybrid, model and template paths separately. Retain earlier failures.
   Measure cache hits, cold-model conditions and concurrency 2/4 in separate runs;
   verify live request/embedding correlation and avoid pooling their percentiles.
   The [60-request run is prepared](docs/evidence/chatbot-latency/current60-plan-20261004.md):
   304 local tests pass, current internal facts match all fixtures, isolated health
   and cache status pass. Paid dispatch awaits the monetary ceiling and resolution
   of the isolated-provider-cap requirement; zero paid chats sent in preparation.
2. **Correctness:** extend role/year denials, ambiguity, topic switches, follow-ups,
   qualified count requests, held-out paraphrases and synthetic populated knowledge.
   Recheck English/Spanish using the legacy corpus on the current configuration.
   Review all replies for facts and language/register, including the documented
   wording caveats; do not treat heuristic passes as native-speaker fluency.
3. **Failure paths:** exercise Cerebras unavailability/fallback, hanging embedding
   requests, provider errors, client cancellation and repeated identical calls in
   isolation. Preserve legitimate multi-step work and verify terminal diagnostics.
4. **Cost:** reconcile the current hybrid workload with isolated provider billing,
   current host prices, cached/reasoning usage, retries/failures and embedding costs.
   The earlier $1.03/1,000 Cerebras result exceeds the existing $0.25 gate; the
   latest SDK estimate is not a billed pass. Declare each run's request/monetary
   budget and verified provider limit before execution; do not relax gates after a run.
5. **Rollout:** record production revision, effective embedding connectivity,
   pgvector schema/indexes and a redacted diagnostics collector across app instances;
   then measure production API and dashboard submit-to-first-render separately.
   Keep interaction-table logging optional until retention/access rules exist.
   Keep GPT-OSS configured, Nemotron rejected and Jev deferred.

This status refresh changes documentation only. Further paid runs require their
own recorded request and monetary budget; deployment and database migration remain
separate work. Local verification for this refresh is recorded in
[status-refresh checks](docs/evidence/chatbot-latency/status-refresh-20261004.md).
That refresh's default-target preflight failed to reach the health endpoint.
Subsequent acceptance preparation found no app on ports 3000–3200, launched a
frozen isolated app at 3102 and passed read-only readiness; the earlier failure
remains recorded. Current preparation is not a paid acceptance result.

## Experiment history

2026-10-04, shared Moroccan reply policy
([results](docs/evidence/chatbot-latency/najm-reply-results-20261004.md)):
published `najm-chatbot@3.3.0`, original 30-case corpus, 30/30 completed and
reviewed, no rescoring or model switch. Completion p50/p95: hybrid 0.523/1.345 s,
model subset 0.951/1.584 s, templates 0.305/0.523 s. Fifteen templates used no
generation tokens but still routed and, for counts, executed guarded reads.
Model-token estimate $0.003020093; serial fresh-cache development run, billing,
broader roles and production acceptance unproven.

2026-10-04, Cerebras-first routing and low reasoning
([results](docs/evidence/chatbot-latency/step3-cerebras-low-20261004.md)):
chatbot/RAG 3.2.0 adopted provider preferences, repeated-call termination and
retired-tool index cleanup. Thirty Moroccan cases: 28/30 automatic passes,
completion 0.81/1.26 s p50/p95; two unreviewed Darija register flags. Account
usage delta about $0.0309 ($1.03/1,000 answers); actual host per request and
fallback behavior unverified. Sequential comparison, uncontrolled caches.
The earlier [prefix probe and rename](docs/evidence/chatbot-latency/cerebras-tool-prefix-20261004.md)
removed the teacher-count tool-name truncation; language/register failures
remained in its 30-case comparison. These findings do not erase the earlier Nitro failures.

2026-10-04, attendance/exam fixes and full model comparison
([results](docs/evidence/chatbot-latency/reply-fixes-results-20261004.md)):
current model first, original corpus twice (100 requests), then corrected exam
recheck (10), then interleaved GPT-OSS/Nemotron pairs (100, plus one price-stopped
greeting). Final-prompt GPT-OSS exam rows passed direct factual review 15/15;
exam median completion 27.273 → 15.128 s. Original automatic paired checks were
47/50 and 45/50; language/factual failures remain documented. Nemotron was faster
but rejected, and the saved model was restored. An explicit price-file fallback
now budgets missing installed prices without changing raw SDK metadata.
No deployment or domain-data write.

2026-10-04, 100 requests with the retained default ([report](docs/evidence/chatbot-latency/default100-fresh-20261004.md)):
50 cases repeated twice, concurrency 1, fresh application caches verified on all
100 samples. All completed; 99/100 automatic checks passed, with one English
attendance-write offer flagged. First text: 6.053 s p50 / 11.413 s p95;
completion: 8.235 s / 27.273 s. Estimated cost $0.015093. These were one-shot
development-API requests, with resident local embeddings and uncontrolled
provider prompt caching. The proposed latency and read-only reply gates failed;
the saved model remains unchanged.

2026-10-04, context size ([review](docs/evidence/chatbot-latency/context-size-20261004.md)): the
system message was 55% of input tokens (960 per model step, uncached), tool
definitions 19% (44 per tool), the conversation 26%. The chat cannot write,
so the prompt's create recipes went; it now says writes are impossible here.
50 questions: 50/50, 174k to 137k input tokens; language-risk set: 36/36,
148k to 83k; blocked writes refuse without a tool call.

2026-10-04, tool cap ([review](docs/evidence/chatbot-latency/tool-cap-20261004.md)): `maxTools` 12
stays. Routing sends 8-10 tools; a cap of six cuts dependencies first and
fails 9/20 core, 3/31 Darija/French and 7/45 benchmark questions that pass
now. Six semantic matches instead of eight lose the Arabic class list and
student search, whose tool ranks 7th-8th. Routing only, no provider calls.

2026-10-03 (night), tool arguments and roles ([review](docs/evidence/chatbot-latency/tool-schemas-20261003.md), [roles](docs/evidence/chatbot-latency/roles-20261003.md)):
until `najm-chatbot` 2.1.2 every tool reached the model with an empty argument
schema (AI SDK 6 reads `inputSchema`, not `parameters`), so the model guessed
argument names. Fixed, then: named students resolve by search only (the full
list cost 52k tokens on one step), a closing reply-language line (2/36 to 0/36
on English tool results), and the chat context names the signed-in parent,
teacher or student. Parent, teacher, student and follow-up checks: 10/10, no
other student in any tool output. Full set: 50/50, 178k input tokens. Twice
in 98 blocked-write replies the model said a refused announcement was created;
the benchmark now fails such a reply (`falseWriteClaims`).

2026-10-03, all 50 questions, default vs `:nitro` ([review](docs/evidence/chatbot-latency/model-nitro-full50-20261003.md)):
`:nitro` completed in 1.0 s p50 / 1.5 s p95 against 3.5 s / 12.3 s, but three
teacher-count answers came back empty. Cerebras, which serves `:nitro`, returned
`teachers_get_teacher_count` calls as `teachers_get_teacher` (12/12 in a direct
probe); Groq rejects the `null` the model sends for optional parameters. Measured
cost about $1.5 per 1,000 answers against $0.18. The saved model is unchanged.

2026-10-03, embedding failure paths, Phase 2 items 1-3 ([review](docs/evidence/chatbot-latency/embedding-residency-20261003.md)):
a warm question embeds in 137 ms p50, a cold one in about 1.7 s, an indexing
batch of 16 long tool texts in 14 s. School's empty knowledge base used to embed
every message again and, with the embedding server down, failed the chat
(`setup_error`) despite the routing fallback. Now (`najm-rag` 2.2.0,
`najm-chatbot` 2.1.1): questions time out after 5 s while indexing keeps 60 s,
skip the server for 30 s after a failure, and `fallbackOnRouterError: 'none'`
answers without the ~51k-token all-tools fallback. Live with Ollama stopped,
12/12 answers said the data was unreachable, in the question's language,
0.8-6.6 s; after Ollama returned the same questions were correct again.
`OLLAMA_KEEP_ALIVE=-1` on this workstation removes the reload after idle.

2026-10-03, full baseline after the fixes ([review](docs/evidence/chatbot-latency/full50-20261003.md)):
all 50 questions in five languages pass (49/50 as scored; the miss was the
language check reading French class names in an English answer's table,
now fixed). Complete answer 4.2 s p50 and 13.1 s p95 on the default
OpenRouter route; School's own work is 0.2 s p50 and under 0.5 s p95, and the
model about 93%. About $0.19 per 1,000 answers. One run: smoke coverage.

2026-10-03, French and Darija ([review](docs/evidence/chatbot-latency/fr-darija-20261003.md)):
the corpus gained 10 Darija (`ary`) cases, and `--languages=fr,ary` runs only
those. On the saved model, French went from 8/10 to 10/10 and Darija from 5/10
to 10/10 (two runs), with no wrong-language reply:
- `teachers_get_teacher_count` replaces counting a list (42, 62 and 84 became 50);
- the system prompt judges the reply language by the user's own words, so a
  student name or French class labels no longer switch a Darija answer to
  English or French;
- Darija words are rewritten to Modern Standard Arabic before tool routing
  embeds a message (`najm-rag` 2.1.3 `rewriteRoutingQuery`, School's
  `darijaRouting.ts`). The embedding model scored every tool about equally
  for Darija, and well for the same question in MSA. Semantic phrases were
  measured and rejected: they replace description matches whenever one clears
  the threshold, and unrelated questions cleared it.

Because the benchmark questions shaped the word list, 31 more Darija and French
routing questions on other topics (`routing-darija-fr.json`) went from 23/31 to
29/31, after more words, French and Arabic sentences on 27 common read tools,
and student-search dependencies for per-student tools. The all-language
preflight stayed at 18/20, and French and Darija passed 20/20 a third time.

Earlier the same day, an audit found 41 chat-callable tools that changed data
without a confirmation; all are now confirmed, so the chat refuses them
(`tests/security/ChatReadOnlyTools.test.ts`). Marking the 249 reads
`readOnly` stopped najm-rag dropping them as possible writes: routing
preflight 14/20 → 17/20 (18/20 with the Darija rewrite).

2026-10-03, host comparison ([review](docs/evidence/chatbot-latency/model-nitro-20261003.md)):
OpenRouter's live stats show the default route serves `gpt-oss-120b` from the
cheapest hosts (CoreWeave, DekaLLM: 23–36 tokens/s). Faster hosts run the same
model at 183–933 tokens/s. The runner's new `--compare-model` mode
interleaved the default with `openai/gpt-oss-120b:nitro`, OpenRouter's
fastest-host route:

| | Default | `:nitro` |
|---|---|---|
| Complete p50 | 1.95 s | 0.63 s |
| Complete p95 | 6.64 s | 1.07 s |
| Checks passed | 12/12 | 12/12 |

The estimated cost rises from about $0.11 to about $0.75 per 1,000 answers.
Adopting it is a change to the AI settings model, not to code. Before adopting:
- add a `:nitro` price to `najm-chatbot`, which today reports no cost for that id;
- review the answers in every language by hand.

Crusoe ($0.05 / $0.25, about 183 tokens/s) would be a middle option. It needs
an OpenRouter account preference, because School cannot send provider routing
options yet.

`gpt-oss-20b:nitro` was rejected ([review](docs/evidence/chatbot-latency/model-20b-nitro-20261003.md)).
It answered 10/12: on both write requests it retried an invalid student search
until `maxSteps` and returned an empty answer. It was not faster than
`120b:nitro` and used 4× the input tokens.

I scanned all 101 cheap, tool-capable OpenRouter models, then compared four
fast ones against `120b:nitro` ([review](docs/evidence/chatbot-latency/model-candidates-20261003.md)).

Candidate from the small smoke set:
- `nvidia/nemotron-3.5-lightning:nitro` passed 12/12 with the right
  languages and facts, at 0.97 s p50 and about $0.18 per 1,000 answers. It is
  a candidate for full-corpus comparison, not an accepted fallback.

Rejected:
- `gemini-2.5-flash-lite` answered an Arabic count question in English with
  a wrong, tool-free number.
- `mercury-2` had one server stream error and one hang.
- `nemotron-3-nano` took 78 s and 9 steps on one write request.

At candidate-test time the runner did not check reply language. It now checks
language and false completed-write claims; these heuristics still require human
review and stronger factual/argument scoring before model acceptance.

2026-10-03, internal baseline ([review](docs/evidence/chatbot-latency/stream-diagnostics-20261003.md)):
School now sends each chat's diagnostics to an in-memory, admin-only log at
`GET /api/chat-diagnostics`, which holds no question text. The interaction log
table stays off (`chatLogging.enabled: false`) until a retention rule exists.
The runner matches each request to its server record by `x-request-id`.

Two runs of 36 requests completed 72/72, with a server record for each. Per
answer, at p50:
- settings, routing, tools and saving took about 10 ms in total;
- routing took about 150 ms for a question it hadn't seen and about 6 ms when
  cached;
- tools took 0.3–19 ms.

The rest is the provider. The same 36 questions ran at complete p50 5.1 s in
one run and 2.7 s in the next, with server stages unchanged. So latency work
belongs in Phase 2 items 5–6 (model choice, context and reasoning size), and
comparisons must interleave runs. Write checks now use the server's
`blocked` outcome; the stream could not tell a blocked tool from a real one.

2026-10-03, Phase 1 (section 5): `najm-chatbot@2.0.5` (published and pinned;
a 2-request live check completed 2/2 with usage) now records diagnostics for each request
to `chatLogging.onDiagnostics` and, when logging is on, to
`metadata.diagnostics` on the interaction log row. They contain:

- **Outcome:** exactly one of completed, error, aborted or setup_error.
- **Timings:** settings, history, routing, context and preparation spans;
  first-text and finish marks.
- **Steps:** finish reason and tokens for each step.
- **Tool calls:** executed, blocked or error, with duration and argument and
  result sizes.
- **Cost:** usage and estimated cost.
- **Correlation id:** the `x-request-id` the client sends.

The row also gains `steps_count`, `success` and `error`.

Building it found a gap: when a provider stream throws mid-answer, the AI SDK
calls no `onError`, `onFinish` or `onAbort`, and the client sees a dropped
connection. Before, such requests were never logged; the body is now watched,
so they are logged, as are client disconnects. All 184 `najm-chatbot` tests
pass after fixing a stale `ai-settings` test, which expected JSON for a
`204 No Content` reply. The API snapshot changes are additive.

Not done yet:
- **Embedding spans** (cache hit/miss, attempts) belong to `najm-rag`
  (section 5.1). Routing and context are timed only as whole spans.
- **School wiring** (section 5.3) is done with the in-memory log above. The
  interaction log table remains off. Rows store questions and tool arguments,
  so set retention and access before enabling it (section 5.2).

2026-10-02, latest: `najm-chatbot@2.0.4` is published and pinned, and School
sets a 30 s stall limit. A 12-request pass completed 12/12, with first text
p50 2.2 s and complete p50 2.4 s. All 12 answers carried usage: 23.8k tokens,
an estimated $0.0012 in total. See [the 2.0.4 section](docs/evidence/chatbot-latency/stream-fixed-20261002.md#after-najm-chatbot-204-report).
Remaining: routing 14/20, the section 6 corpus and sample size, non-admin
roles, production.

2026-10-02, fixes ([review](docs/evidence/chatbot-latency/stream-fixed-20261002.md)):
- **Date:** today's date and weekday now come per request from the school's
  clock. The old prompt date was computed once at startup, in UTC.
- **Language:** replies now match the question's language. French grade
  requests: English 3/3 before, French 3/3 after.
- **Greetings:** now 219–480 characters, describing lookups only.
- **Name lookups:** they use `search_search_students` instead of the full
  list, so write requests went from 12.5 s to 6.7 s complete p50.
- **Blocked actions:** the message now says nothing was done and not to ask
  for confirmation in chat.
- **Blocking proven:** with a real demo student, the model called
  `attendance_mark` and `grades_create`, both were refused, and the database
  was unchanged.

In the Najm clone, `najm-chatbot` gained a `streamTimeout` (default chunk
limit 60 s) and correct v6 token usage. Its tests and build pass. It needs a
2.0.4 release and School pin before School gets them (then set
`streamTimeout: { chunkMs: 30_000 }`).

2026-10-02, seeded run ([review](docs/evidence/chatbot-latency/stream-seeded-20261002.md)):
after `seed:demo`, 36 requests (12 cases × 3) gave first text p50 2.4 s
(p95 12.5 s) and complete p50 4.8 s (p95 16.6 s) over 35 completed requests.
Count answers were correct 12/12. Findings for the next phases:
1. A provider stream went silent mid-answer, and nothing ended it before the
   runner's 120 s abort. A stall timeout is needed in `najm-chatbot`.
2. French grade-entry requests were answered in English, 3/3.
3. One French answer gave the wrong date for today.
4. Write requests are the slowest (p50 12.5 s). The suspected cause is
   full-list student lookups; this needs tool-result sizes from Phase 1 to
   confirm.
5. Blocking is still unproven: the synthetic name never reaches the write tool.
6. The stream carries no token usage.

Use this run as a smoke reference, not the acceptance baseline. Next: add
argument and result-size capture (Phase 1); decide whether a write case may use
a real student's name to prove blocking; grow the corpus and repetitions.

2026-10-02, later: the key and `openai/gpt-oss-120b` were saved to AI Settings
via the admin API, and the 12-case smoke set ran
([report](docs/evidence/chatbot-latency/stream-smoke-20261002.md)). All 12
completed. First text p50 was 5.1 s (max 12.3 s); complete p50 was 8.5 s
(max 20.3 s). Every read used two LLM steps, and answers were correct for the
data. Caveats: this workstation's database has **no students, attendance or
grades**, so reads returned nothing. The write cases never reached the blocked
tool. The stream reports **no token usage**. Greetings answered quickly but
ran long (up to 20 s) and over-promise write abilities. Next: run on seeded
data, then repeat for sample size.

2026-10-02, second workstation (`C:\Users\pc`): there was no llama.cpp or Qwen
install here, and the app was on the source default (Ollama EmbeddingGemma),
which passed **6/20**. Qwen3 Embedding 0.6B Q8_0 now runs through Ollama's
OpenAI-compatible endpoint (`.env.local`), all 430 tools were reindexed, and
the 20 held-out cases pass **14/20** with the current instruction. pgvector was
already correct here. See [the re-run](docs/evidence/chatbot-latency/routing-trial.md#re-run-on-the-second-workstation-2026-10-02).
The section 4.2 runner exists ([guide](docs/tests/chatbot-latency.md)) with a
12-case smoke corpus. A keyless one-request probe proved body, year and
stream framing ([probe](docs/evidence/chatbot-latency/stream-transport-probe-20261002.json)).
At that point AI Settings had no key; see the later entry above.

Earlier the same day, on the original workstation: OpenRouter /
`openai/gpt-oss-120b` was configured in School's AI settings (`hasKey:true`)
and the chat widget answered locally in the selected academic year ([release follow-up](docs/tests/academic-year-release-2026-10-02.md),
`SCHOOL-ACADEMIC-YEAR-HISTORY-PLAN.md` section 0.1j). Since the 12/20 preview
below, the Qwen query instruction changed ("teacher request" → "user request",
commit `b96c55f`), student-list tool descriptions became multilingual, and
`students_get_student_count` was added; the 14/20 re-run above reflects them.

Informal timings from that follow-up, four local samples through the
release check, not the section 4.2 runner: first answer text 1.8–8.4 s,
complete answer 2.2–8.6 s. Earlier long-list count requests took roughly
71–79 s and returned wrong totals; the aggregate count tool replaced them.
These are leads for the baseline, not a baseline.

2026-09-30: the local app at port 3102 is healthy. Authenticated diagnostics found
428 registered tools, zero indexed tools, zero semantic phrases, and no dependency
mappings. Routing preview returned `router_error` because local Ollama was
unreachable. See [preflight evidence](docs/evidence/chatbot-latency/preflight.md)
and the [routing-only runner guide](docs/tests/chatbot-routing.md).

Follow-up: llama.cpp b11146 with EmbeddingGemma Q8_0 is running locally on
port 18080 (since replaced by Qwen on 18081, below). `najm-rag@2.1.0` was published and adopted; its adapter passed 221
package tests. The local database needed a pgvector schema repair before all
428 tools could be indexed. The first full preview matrix passed 4/20 minimum
selection checks. A trial with 14 general semantic phrases passed 3/20 and was
rolled back. See [routing trial evidence](docs/evidence/chatbot-latency/routing-trial.md)
and [local setup](docs/tests/local-embeddings.md).

The follow-up Qwen3 Embedding 0.6B trial ranked the primary tool in the top 12
for 16/20 direct cases using 768 dimensions. Published `najm-rag@2.1.1` adds
opt-in vector shortening; School now uses that version and Qwen locally
(llama.cpp, `openai-compatible`, port 18081). After
reindexing 428 tools, adding explicit teacher-task lookup dependencies, and
clarifying two grade-tool descriptions, the admin preview passed 12/20 cases.
Grade report/create requests in several languages and mixed follow-ups still
miss. A Qwen phrase experiment regressed to 10/20 and was rolled back. This is
selection evidence only, not teacher execution or chat latency acceptance.

The next routing change should be in shared Najm: compare phrase and tool
description matches together, use a single strongest score per tool instead of
summing repeated phrases, and preserve lookup dependencies inside the tool cap.
Keep the 20 current cases held out and add new paraphrases before judging a
change.

**Out of scope here:** an executable review-and-confirm path for attendance or
grade writes, and extracting grades from a photo of a filled grade sheet with a
teacher review screen. Both are feature work, not latency work, and belong in
their own plan; this plan only benchmarks that writes stay blocked (section
2.2). Until they exist, retain the direct dashboard correction path for
teachers. Limited-role selected-year refusals were proven locally in 0.1j of
the academic-year plan. The separate 10/10 role check now provides local ownership
and follow-up evidence; permission-filtered routing and broader repeated coverage
remain unverified (section 2.4).

Scope: School's dashboard assistant, built on `najm-chatbot` and `najm-rag`,
from sending a question through receiving the completed answer. Preserve answer
quality and authorization in English, French, Modern Standard Arabic, Darija,
and Spanish; Darija checks currently require Arabic-script output.

## 1. Decision and order of work

**Local Qwen embeddings (Ollama here, llama.cpp on the original workstation) and
the configured OpenRouter chat model have local evidence. Jev remains optional.** No new
paid provider is a prerequisite; paid chat runs need a declared budget.

1. Re-run the 20 routing cases under the current Qwen instruction and tool
   descriptions; check runtime configuration, embedding connectivity, the
   database's pgvector schema, and routing failures. **Latest preview, 2026-10-04:
   18/20 core, 30/31 Darija/French. Remaining misses are not silently accepted.**
2. Build the section 4.2 runner and establish an external baseline using the
   actual streaming chat route. **Runner and 50-case corpus built; local full-set
   smoke runs recorded; default is now the 30-case Moroccan corpus with richer
   facts/register scoring. Latest reviewed hybrid run passes 30/30. An acceptance baseline still needs controlled caches/load,
   stronger scoring, broader cases and repeated samples.**
3. Add shared instrumentation in Najm and establish a controlled internal baseline.
   **`najm-chatbot` diagnostics released in 2.0.5, wired into School and the
   runner; local internal traces captured (2026-10-03), with caches/load
   uncontrolled. Request-scoped embedding spans followed in RAG 2.4.0 / chatbot
   2.2.1 (2026-10-04); serial fresh-cache traces are verified. Current repeated,
   cold-model and concurrent acceptance remains.**
4. Compare configuration, model, routing, and tool-call improvements separately.
   **Timeout/fallback, tool-cap and prompt-size experiments done locally. Nemotron
   full-corpus comparison rejected. GPT-OSS retained with Cerebras-first/low-effort
   policy and guarded School templates; validate this configuration before any new candidate.**
5. Consider Jev only if measured traffic and avoidable LLM spending justify it.

Do not assume that the LLM dominates latency. Embedding timeouts, database/tool
calls, large tool prompts, and provider retries are competing hypotheses.
The former 1.5-second first-text and 1-second completed-answer targets remain
aspirations until a baseline supports realistic acceptance thresholds.

The streaming runner, shared chatbot instrumentation, published School adoption
and local internal smoke baseline are complete. Per-embedding telemetry is now
available; controlled acceptance and deployment measurements remain. A local database schema repair
was required; production schema state remains unknown. Use section 0 as the
completion ledger and keep paid runs within their recorded budgets.

## 2. Verified source findings and runtime unknowns

Reconciled **2026-10-04** against School source and the matching read-only
reference at `C:\Users\pc\Desktop\najm`. Root pins: `najm-rag` `3.2.0`,
`najm-chatbot` `3.3.0`, `najm-mcp` `2.2.5`, `najm-theme` `0.3.0`,
`najm-core` `3.0.3`, `najm-api` `5.0.0`. Runtime claims remain tied to the
dated reports; this source review does not re-run their benchmarks. Compare
reference versions with root pins again before any shared implementation.

### 2.1 School configuration

In `packages/server/src/config/ragConfig.ts` and `chatbotConfig.ts`, re-read
2026-10-04 (`config/index.ts` re-exports the plugin factories):

- `RAG_EMBEDDING_PROVIDER` selects `ollama` (default) or `openai-compatible`.
  The source defaults are still Ollama, `embeddinggemma`, 768 dimensions, and
  `http://127.0.0.1:11434`. **Local runtimes override them, and differ per
  workstation:** the original one runs llama.cpp serving `qwen3-embedding`
  (Qwen3 Embedding 0.6B Q8_0) at port 18081; the second (`C:\Users\pc`) serves
  the same Q8_0 model from Ollama at `http://127.0.0.1:11434/v1`. Both use
  `openai-compatible` with `RAG_EMBEDDING_TRUNCATE_DIMENSIONS=true` shortening
  its 1024 values to 768. Record which one produced each result. For Qwen, School supplies the query instruction
  "Retrieve the school management tool that fulfills the user request" and
  an empty document prefix. A query-prefix change alters routing scores without
  invalidating stored tool vectors; a model, quantization, or document-prefix
  change requires reindexing.
- On the original workstation the Qwen server is a manually started process
  (`scripts/start-local-embeddings.ps1 -Model Qwen3`), not a supervised service.
  Ollama on the second workstation starts at login through a Startup shortcut
  per the 2026-10-03 residency review. `OLLAMA_KEEP_ALIVE=-1` was applied and
  verified after restart; it keeps loaded models resident but does not preload
  after a reboot. On
  2026-10-01 chat failed in preparation because it had stopped and its model
  file was missing (academic-year plan 0.1h). Treat embedding-process
  availability as a latency and failure risk, not only model residency.
- School's indexing timeout is **60,000 ms** (`RAG_EMBEDDING_TIMEOUT_MS`).
  Questions have a separate **5,000 ms** bound
  (`RAG_EMBEDDING_QUERY_TIMEOUT_MS`) and **30,000 ms** failure cooldown
  (`RAG_EMBEDDING_QUERY_COOLDOWN_MS`); health probes have a separate timeout.
- Tool routing and knowledge support are enabled, with explicit lookup
  student-search dependencies for per-student reads and blocked writes, plus
  assessment/date dependencies where needed. `rewriteDarijaForRouting` wraps
  the published `createDarijaQueryRewriter` from `najm-rag/query-rewrites` with
  School's domain vocabulary and phone-number rule. Common wording and the
  engine are shared; semantic phrases remain tool-linked examples. Rewriting
  applies to routing input only; the model still sees the original question. Effective RAG
  Studio settings can override routing limits and disable knowledge retrieval.
- Chat allows up to 10 LLM steps and stores conversations in the database.
  Ten is a ceiling, not an observed step count. The stream stall bound is 30 s.
  Interaction logging is disabled; the redacted `onDiagnostics` sink is enabled.
  The retained saved model is OpenRouter / `openai/gpt-oss-120b`. Source config
  requests Cerebras first with fallbacks allowed, ignores Groq and sets reasoning
  effort low; source policy does not prove which host handled a live request.
- `reply.detectLanguage` uses Najm's opt-in Moroccan latest-message detector;
  `reply.template` uses School's domain templates and already-validated year.
  Unqualified student/teacher totals execute guarded reads; recognized school
  writes return localized refusals. Qualified or unfamiliar requests fall back
  to the model. Templates preserve the stream/memory/diagnostics contract and
  have no generation tokens; routing/knowledge work still occurs.
- Chat runs in the dashboard's selected academic year. `ChatController` is a
  REST year consumer in `config/yearScope.ts`; each request validates the year
  before provider work, and `SchoolChatContextProvider` adds the year and role
  rules to the system prompt. Both are per-request preparation work.
- The database schema exports AI settings and chat sessions, but not
  `chatbotInteractionLogsTable`.
- `compose.production.yml` has no embedding service of either kind. Its absence
  does not prove an outage: the effective production endpoint and container
  connectivity are unknown.

### 2.2 Installed behavior that matters to this plan

- Tool counts in older reports are snapshots, not a current runtime inventory
  or the number available to a particular signed-in user. Recount registered
  and indexed tools in each controlled run.
- Successful routing defaults to `maxTools: 12`, `topSemanticHits: 8`, and
  similarity threshold 0.45. Dependencies are expanded before the final slice;
  lowering `maxTools` can remove a required lookup tool.
- **Twelve is not a global cap.** The package's router-error default is `all`,
  but School explicitly uses `fallbackOnRouterError: 'none'`. An error therefore
  supplies no data tools and a notice that data is unreachable. No-match behavior
  defaults to `none`. Disabled routing or an effective `all` fallback can still
  return the routable inventory; record effective settings, not defaults alone.
- Selected tool definitions remain available across LLM steps. Actual input
  charges depend on provider usage and prompt caching; schema estimates are not
  billing evidence.
- Preparation still awaits routing and then knowledge context sequentially.
  `najm-rag` now skips query embedding for an empty knowledge index and returns
  an unavailable notice when knowledge search fails. Query failures open the
  cooldown, avoiding another full wait. A populated index and Darija's rewritten
  routing/original knowledge queries can still require distinct embeddings;
  measure that path rather than assuming deduplication.
- Query embeddings have an in-process LRU cache, default size 256. Knowledge
  context has another cache, size 32. A repeated question can avoid embedding
  or retrieval even after the embedding model has been unloaded or stopped.
- Ollama embedding requests omit `keep_alive`. Ollama documents a five-minute
  default residency unless its configuration changes this. llama.cpp keeps its
  model loaded for the life of the server process, so locally the cold case is
  a process start, not an idle unload. Cached questions still avoid a model call.
- Knowledge retrieval defaults to five chunks. Document index definitions exist
  in migration 0020; applied indexes and actual query cost remain runtime checks.
- Tools marked with confirmation metadata are **blocked** by the chat adapter.
  It does not implement an executable approval/resume flow. Benchmark the blocked
  outcome; do not introduce writes as part of latency optimization.
- Published chatbot 3.2.0 added termination after two identical tool-call steps;
  live triggering and preservation of legitimate multi-step work remain acceptance
  items. RAG 3.2.0 prunes retired tool embeddings during indexing. School's MCP
  names avoid prefix collisions; REST route paths were preserved by the rename.

### 2.3 Evidence available and still missing

- Correlated streaming diagnostics now record preparation stages, steps, tool
  outcomes/durations/sizes, aggregate usage and estimated cost, plus request-scoped
  embedding cache hits/misses, attempts and per-call spans. Serial correlation and
  fresh-cache checks passed; live concurrent correlation remains. Reply diagnostics
  identify template/model paths. The sink holds only
  200 records per process and is lost on restart; durable/multi-instance
  collection needs its own design before production measurement.
- The admin-only `POST /api/rag-studio/chat-debug` returns tool traces and
  `latencyMs`, but uses `generateText` and performs extra trace work. Its latency
  cannot substitute for the actual streaming route.
- Multi-step usage now uses SDK `totalUsage`, normalized input/output counts.
  Estimated prices and browser metadata are not authoritative bills. Earlier Nitro
  and Cerebras reports reconcile account usage deltas for those runs; the latest
  shared-policy run supplies SDK estimates only. Require current host/price dates
  and billed failure/retry reconciliation for acceptance comparisons.
- Local settings, seeded data and indexed tools have dated evidence. Controlled
  cache/load/concurrency comparisons, populated knowledge, production connectivity
  and production schema/billing remain unverified. Recheck effective settings
  and fixture facts before the next run.

### 2.4 Routing correctness prerequisites before cap tuning

The 2026-10-04 cap experiment rejects six and retains cap 12 / semantic hits 8.
The following remain prerequisites for future routing changes:

- Evaluate complete operation-plus-lookup coverage. Dependency expansion followed
  by a final slice can remove a required lookup even if the primary tool survives.
- Compare selection after permission-based candidate filtering. The current
  routable-tools filter only excludes RAG Studio internals; execution guards remain
  a separate boundary. The 10/10 role run tests ownership at execution, not
  permission-filtered candidate selection or every denied route.
- Test unequal example-phrase coverage. Summing the strongest three scores can
  favor a tool with several weaker phrases over one stronger match. Tool-description
  retrieval only runs when no semantic phrase qualifies.
- Test topic changes and short follow-ups. Routing uses the latest three user text
  turns by default, not assistant clarification text or image contents. The selected
  tools remain fixed within an LLM request. Photo extraction and approval/resume
  are separate workflow requirements, not routing configuration changes.
- Do not treat preview as the production router: `RoutingPreviewService` expands
  dependencies one level and returns no tools on an embedding error, while
  `ToolRouterService` expands transitively and applies its configured error fallback.
  Preview also does additional scoring work. Check parity before using preview
  results to certify the chat path; an HTTP 200 can contain `router_error`.

The initial 20-case routing corpus includes English, French, Arabic, Spanish,
Darija, mixed language, follow-up text, and a topic switch. Its expected tool groups
are minimum candidate coverage checks, not proof of valid arguments or completed
school operations. Expand to the section 6 benchmark before making accuracy claims.
The latest preview is 18/20 core, 30/31 Darija/French and 44/45 tool-requiring
benchmark questions (2026-10-04). These are selection checks, not completed
answer scores; a blocked write may be refused without its tool. Add independent
held-out paraphrases, record remaining misses, and verify actual chat execution
after a routing change instead of certifying it from preview alone.

## 3. Test prerequisites and required APIs

The met prerequisites below describe the earlier dated local runs. Subsequent
[current acceptance preparation](docs/evidence/chatbot-latency/current60-plan-20261004.md)
establishes isolated health/settings/cache readiness at port 3102, superseding
the unavailable-app status-refresh check. It does not prove paid provider
connectivity, current billed-cost acceptance or production readiness. Confirm
the intended instance before execution; do not infer readiness from source pins.

| Requirement | Purpose and configuration |
|---|---|
| Running School app and test account | Exercise authenticated `/api/chat`; admin access for configuration/debug only where required |
| Existing chat provider key and exact model ID | **Met on both workstations:** OpenRouter / `openai/gpt-oss-120b`. On the second, the key was saved through `PUT /api/ai-settings` from a local env variable on 2026-10-02. Record the custom base URL if applicable |
| Seeded test data | **Met on the second workstation (2026-10-02):** `seed:demo` after verifying the synthetic 2026-2027 calendar; 100 students, 946 student attendance rows, 64 grades |
| Working embedding endpoint | **Met on both workstations** via `RAG_EMBEDDING_PROVIDER=openai-compatible`: llama.cpp Qwen on 18081 (started manually; confirm it runs before each run) or Ollama Qwen at `11434/v1`. Ollama EmbeddingGemma remains the source default; none needs a provider API key locally |
| pgvector schema on the target database | `vector` extension present and RAG embedding columns typed `vector(768)`; `db:check` does not detect a mismatch |
| Selected academic year | Fix the year sent with each chat request; it changes tool results and the system prompt |
| Representative test data and indexed tools | Known answers, valid IDs, and documents for knowledge cases |
| Request and spend budget | Bound paid calls, including warmups, failures, and retries |
| TypeSafe key, only for Phase 4 | Proposed server-only `TYPESAFE_API_KEY`; Jev integration is not implemented |

Use `apps/dashboard/.env.local` for environment values and document new variables
in `apps/dashboard/.env.local.example`. Keep chat keys in the existing settings
flow. Reports contain configuration identifiers, never credentials.

Use internal REST/MCP for data inspection and benchmark requests. Reuse suitable
seeded records and use anonymized questions. Do not automate a browser to manipulate
school data. Identify missing prerequisites before adding test records or indexes.

## 4. Phase 0 — preflight and initial external baseline

This phase does not require a new Najm release or interaction-log migration.

### 4.1 Inspect the running setup

1. Record School commit, package versions, runtime mode, provider/model, test
   dataset identity, and effective AI/routing settings without secrets.
2. Confirm the assistant is enabled and the configured model supports the tool
   contract used by the adapter. Setup failures are not slow successful answers.
3. Probe the configured embedding endpoint **from the application runtime's
   network context**, checking provider, vector dimensions, and model
   availability. A successful host probe does not establish access from an
   application container.
4. On the database actually used, confirm the `vector` extension and that the
   three RAG embedding columns are `vector(768)`. The local database lacked
   both until the 2026-09-30 repair, and `db:check` did not notice.
5. Inventory registered and indexed tools and knowledge documents; a tool was
   added after the 428-tool count (`students_get_student_count`), so recount
   and confirm the index is current. Record effective limits, dependency rules,
   knowledge enablement, and error/no-match fallback settings.
6. Use the admin debug route on a few read-only questions to inspect routing and
   tool calls. Keep these diagnostic runs separate from streaming measurements.
7. Start locally or in staging. If production inspection is in scope, record its
   effective endpoint and live revision separately rather than inferring either
   from local configuration or the compose file.

Do not wait for complete telemetry before repairing a demonstrated connectivity
problem. Capture the observed failure and a small before/after comparison, then
label the repaired configuration as the baseline for subsequent experiments.

### 4.2 Measure the actual stream

Create a Bun runner for `POST /api/chat`, using the installed UI message protocol
and a unique session for each independent case. Parse events across network chunk
boundaries. HTTP 200 alone does not establish successful completion.

Record with a monotonic clock:

- request start, response headers, and first response byte;
- first non-empty assistant `text-delta`, excluding metadata, reasoning, and tool events;
- protocol finish, response-body end, and the completed answer;
- HTTP/stream errors, timeouts, and client aborts.

First byte is not first answer text. These are API-client timings including
transport; browser submit-to-first-render is a separate acceptance measurement
if performed later. Do not label API timings as browser results.

Start with a small read-only smoke set, then expand using section 6. Report cost
as unknown where usage is missing. Internal timings and exact tool execution on
streaming requests may remain unavailable until Phase 1; separate debug calls
provide diagnostic evidence, not traces of those same requests.

**Deliverable:** `docs/evidence/chatbot-latency/preflight.md`, containing setup
status, initial stream results, routing observations, gaps, and the full-run budget.

## 5. Phase 1 — shared instrumentation and controlled baseline

### 5.1 Ownership

| Owner | Responsibility |
|---|---|
| `najm-chatbot` | Request lifecycle, LLM/tool spans, aggregate usage, terminal outcomes, persistence, normalized stream usage |
| `najm-rag` | Embedding/cache, routing/retrieval spans, and a public request-scoped diagnostics contract |
| School | Configuration, additive log-table migration, fixtures, runner, reports, and published package adoption |

The public contract is available in RAG 2.4.0 / chatbot 2.2.1. Embedding calls
and attempts are scoped through `RAG_DIAGNOSTICS`, with separate cache status,
operation, timing and terminal category. Chat includes preparation and tool-side
events with request-relative offsets. Unfinished capture at a terminal outcome
is marked partial. School's runner summarizes all outcomes, keeping missing
capture distinct from zero calls. No private cache inspection is needed;
`clearQueryCache()` clears only one embedder's cache, not every cache/model state.

School must not inspect
private caches or monkey-patch installed code. Correlate events per request under
concurrency. Logging failures must not break answers or consume a stream twice.

The sibling Najm source is read-only during School work. Shared changes belong in
a separately scoped Najm release task. School consumes only published packages:
no local links, copied source, `file:` dependencies, or local tarballs. Verify
publication, update exact root pins and matching overrides, and update `bun.lock`
with `bun install`. Release both packages if the diagnostics contract requires it.

### 5.2 Measurement contract

Record these in interaction-log metadata or a documented diagnostic sink:

| Area | Required evidence |
|---|---|
| Identity | Request/run/case ID, role, language, selected academic year, provider/model, config/package/dataset versions, history size |
| Preparation | Settings/history load, academic-year validation and School context provider, total preparation, routing, and knowledge-context durations |
| Embeddings | Purpose, duration, cache hit/miss, attempts, timeout/error for each call |
| Retrieval | Semantic/tool/document searches, selected counts, routing status, fallback reason, missing dependencies |
| Generation | First text, each LLM step, finish reason, retries when observable, `steps_count` |
| Tools | Name, start/end, executed/blocked/denied/error outcome |
| Completion | Generation end, persistence duration, stream finish, timeout stage, failed/aborted outcomes |
| Usage | Aggregate input/output tokens, cached/reasoning details when available, price source/date, estimated cost |

Use start/end spans and document nesting. Routing may include embedding;
preparation includes routing. Do not add nested or overlapping durations as if
they were independent elapsed times. Tool execution must be distinguishable from
provider time.

Use **`totalUsage` across all SDK steps**, or a reconciled sum of step usage.
`onFinish` also exposes the final step's usage, which alone undercounts multi-step
answers. Normalize `inputTokens`/`outputTokens`, preserve unknown values, and
respect provider-specific cached/reasoning accounting without double-counting.
Reconcile billed retries and failures with provider records where available.

Record one terminal outcome even for failures before `streamText`, provider errors,
or client cancellation. Success-only logging would hide the slowest failures.
Report estimates separately from invoices. Use redacted diagnostic fields and
set retention/access rules before logging real questions or tool arguments.

### 5.3 Integrate in School

**Current path:** School uses `onDiagnostics` with interaction logging disabled.
The interaction table is not exported in School's schema. Steps 1–3 below are
conditional on choosing durable interaction logging; they are not prerequisites
for the redacted sink or the next local benchmark. Define retention/access first.

1. Export `chatbotInteractionLogsTable as chatbotInteractionLogs` from
   `najm-chatbot/pg` in `packages/server/src/database/schema/index.ts`.
2. Run `bun run db:generate`; review the SQL and target migration history. Accept
   only the intended additive table/index changes, with no unrelated drops.
3. Apply the reviewed migration using `bun run db:migrate` on the designated
   development/test database. Production application is a separate rollout step.
4. Decide logging explicitly in `chatbotConfig()`. `chatLogging.enabled`
    defaults to `true` in the package, but School overrides it to `false`. Either
   enable it with the table and a retention rule, or use `onDiagnostics` alone,
   which carries no question text or tool arguments. The benchmark runner can
   match rows to cases by sending `x-request-id`, which is recorded as
   `correlationId`.
5. Verify successful, blocked/denied, embedding-failure, and aborted requests;
   check correlation, aggregate usage, log persistence, and terminal outcomes.
6. Re-run unchanged cases/settings to measure instrumentation overhead before
   adopting unrelated performance changes.

**Gate:** usable correlated traces and a controlled baseline report. Claims about
which internal stage dominates require this evidence; Phase 0 still provides an
external baseline. Shared diagnostics releases are adopted; broader controlled
acceptance remains pending.

## 6. Benchmark contract

Files (created 2026-10-02 unless noted):

- `scripts/chatbot-benchmark.mjs` with `scripts/chatbot-stream.mjs` (parser,
  tested in `scripts/tests/chatbot-stream.test.mjs`): streaming runner, request
  limits, and budget controls. `.mjs` follows the other `scripts/` runners.
  Server diagnostics are read for each request by `x-request-id` (2026-10-03).
  `--compare-model` interleaves the saved model with a candidate, and
  `--languages=fr,ary` runs only those cases (2026-10-03). Bounded concurrency
  1/2/4 and chat/embedding correlation validation were added on 2026-10-04;
  comparisons remain serial. Non-admin accounts and conversation replay still
  need integration in this runner. Separate `scripts/chatbot-roles.mjs` supplies the
   10/10 role/follow-up smoke checks; integrate broader coverage and reporting.
- The runner now defaults to `datasets/chatbot-latency/morocco.json`: 30 independent
  admin cases, ten each in Darija, Modern Standard Arabic and French, with frozen
  class/exam facts and register checks. `scripts/chatbot-school-facts.ps1` reads
  authoritative internal facts; `scripts/chatbot-morocco-corpus.mjs` binds the corpus
  to their capture time/hash. Recheck facts before a run; never overwrite historical
  evidence to match a changed fixture.
- `datasets/chatbot-latency/questions.json`: legacy 50 independent cases, 10 per
  language (English, French, Spanish, Modern Standard Arabic, Darija), since
   2026-10-03. Missing-student cases exist; ambiguity, populated knowledge,
   topic changes and broader role/follow-up/denial cases still need inclusion.
- `datasets/chatbot-latency/routing-cases.json` (20) and `routing-darija-fr.json`
  (31): routing-only cases for `scripts/chatbot-routing-preflight.mjs`
  (`--cases=<file>`).
- `docs/tests/chatbot-latency.md`: setup, execution, scoring and opt-in fresh
  query/knowledge cache controls; model residency/provider caches remain separate.
- `docs/evidence/chatbot-latency/`: sanitized raw samples and comparison reports.
- `scripts/chatbot-run-lock.mjs`: cooperative machine-wide lock across updated
  checkouts. The runner verifies provider/model before each chat and retains
  corpus/scorer/prompt/template/context hashes. Older runners and other settings
  writers bypass this lock; freeze the app build during measurement.

### 6.1 Corpus and correctness

The default 30 Moroccan questions cover small talk, single/multi-tool reads,
missing students and blocked-write requests in three languages with authoritative
class/exam rows. The legacy 50-case corpus remains available explicitly for five-language
regressions. Extend these frozen cores with grounded knowledge, held-out wording
and broader role/conversation cases; version additions and record each corpus hash.
The extended fixture contract must specify role, selected academic year, fixture
IDs, expected tools/alternatives, important arguments, answer facts, and refusal
behavior. Role/year are currently corpus-level; per-case arguments can be scored
through `expectedToolCalls`, initially populated for the five missing-student cases.
Include count questions: list-based counting took 71–79 s and gave wrong totals
before the aggregate tool existed. Human-review quality in every
language; a fast incorrect answer fails.

Current automatic scoring checks successful tool-output groups, exact required
argument subsets (`expectedToolCalls`), required/forbidden fact boundaries,
reply language, completed-write claims and write promises. A null language
detection now fails automatic acceptance and sets `reviewRequired`, unless a
fixture explicitly opts out with `replyLanguage: null`. Arguments remain in
memory for scoring and are stripped from saved tool reports. Whole-answer
factual correctness still requires richer fixture facts and human review. Include
read-only refusals that never call a tool, and distinguish those from adapter
blocking proved by a `blocked` server outcome. Check knowledge citations and
the honest knowledge-unavailable reply using synthetic indexed documents.

The Moroccan scorer additionally checks exact class sections, each displayed exam
row/date/time and next-five order, mixed-language prose and Arabic/Darija register.
Exact stored names are exempted at word boundaries. This does not establish native
fluency or correctness of every narrative claim. Qualified counts must retain
their qualifier on the model path; test that templates do not answer with a school
total when the user asks for a class, gender, attendance state or another year.

Add controlled follow-ups, ambiguity, missing records, authorization denials, and
routing misses. Freeze dataset, indexed semantics, documents, and history fixtures
for comparisons. Independent cases use fresh sessions; conversation cases replay
the same history. Repetitions must not silently grow conversation length.

Do not create, update, or delete real school records through the benchmark.
Write cases validate the existing block, not a hypothetical confirmation flow.

### 6.2 Cache and load conditions

| Condition | Setup and evidence |
|---|---|
| Application cache hit | Pre-run the exact input/history and verify the observed hit |
| Empty query/knowledge caches, warm embedding model | Use opt-in isolated-dev controls with serial `--cache-mode=fresh`; verify same instance/reset and an actual completed routing embedding miss/attempt; separately prove no model reload |
| Empty query/knowledge caches, cold embedding model | Use the same fresh-cache controls, then unload the isolated Ollama model or restart the isolated llama.cpp process; verify a real call and reload |
| Embedding process down | Stop the isolated llama.cpp process and measure the outcome; this is the failure seen on 2026-10-01 |
| Concurrent traffic | Declare client concurrency; report queueing, rate limits, errors, and results separately |
| Failure paths | Exercise refused connections, hanging embedding requests, provider failures, and client cancellation in isolation |

Unloading or restarting the embedding model alone does not make a repeated query cold. Restarting the app can
also introduce app/database cold starts; warm or measure them separately. Do not
unload a shared production model to benchmark. Count warmups toward spend and
record provider prompt caching separately from application RAG caches.

Three repetitions are smoke coverage only. Size extended runs to the decision;
aim for at least 100 observations per important comparison group where affordable,
report sample counts/uncertainty, and do not treat that count as a statistical
guarantee. Small cold-run or language subgroups remain exploratory. Interleave
baseline/candidate runs to reduce time-of-day bias and obey the declared budget.

### 6.3 Reports and gates

Report p50/p95 first text and completion, internal spans, errors/aborts, tool and
answer correctness by language/role, usage, cost per attempt, and cost per correct
completed answer. Separate cache/load conditions. State treatment of failures
and timeouts; never silently remove them to improve percentiles.

Report hybrid totals and separate template/model distributions with sample counts.
Use `server.reply.source` rather than the selected model label to identify templates;
they report zero generation usage and derived `modelAndStreamMs`, but still incur
routing/knowledge and guarded-read work. Template share is a corpus property, not
a measured production traffic mix. Preserve unknown billing separately from zero
template generation cost. The cooperative run lock and provider/model checks do
not replace a frozen build/configuration or actual per-request host evidence.

Keep observed results separate from traffic-weighted monthly projections. A
balanced fixture set does not establish the distribution of real user questions.

Before each comparison, record the latency/cost target, allowed non-target
regression budget, and sample plan. Require no observed authorization or blocked-
write regressions, review all correctness regressions, and reject improvements
that merely hide a weaker language or fall within measurement variability.

### 6.4 Proposed acceptance targets and next comparison

These are planning targets for the next controlled experiment, **not achieved
results or a production SLA**. They are deliberately less aggressive than the
old sub-second aspirations and must be recorded in the run report before testing.

| Metric | Proposed gate |
|---|---|
| API first answer text | p50 ≤ 3 s, p95 ≤ 8 s |
| API completed answer | p50 ≤ 5 s, p95 ≤ 15 s |
| Completed, non-empty answers | At least 99% of attempts; all failures counted |
| Authorization and read-only policy | Zero observed leaks, executed writes, false write claims or promises to perform writes |
| Answer/tool correctness | All fixture checks pass on completed answers; inconclusive language and factual cases receive human review |
| Estimated API cost | ≤ $0.25 per 1,000 correct completed answers, including failed-attempt spend; reconcile provider billing where available |
| Candidate improvement | At least 20% lower completion p95 than the interleaved default; first-text/completion p50 may not regress more than 10%; preserve the gates above |

Next, validate the retained configuration before considering another model:
30 frozen Moroccan cases × 2 repetitions = **60 outer chat requests** at
concurrency 1, warm embeddings and verified fresh application caches. Keep the
current Cerebras-first/low-effort/template policy fixed and review every reply.
This repeat is regression evidence, not enough to establish per-language p95 or
a 1% failure guarantee. Templates can avoid provider generation, but every outer
request counts toward the request budget; do not assume an unobserved path is free.
Recheck the legacy 50-case English/Spanish coverage separately with explicit
`--cases=datasets/chatbot-latency/questions.json` and its own budget.

If a candidate is justified after current acceptance, use 50 frozen legacy
questions × 2 repetitions × 2 variants = **200 outer chat requests**, 100 per
variant, or predeclare a versioned Moroccan/extended corpus and its sample counts.
Hold reply templates constant and compare the model-generated subset as well as
hybrid totals; templates cannot prove one model is faster. Alternate variant
order as the runner does. Expand important language/role groups toward 100
observations when the decision depends on them. Role/conversation, cache-hit,
cold-model and concurrency-2/4 runs have separate conditions and budgets;
`--cache-mode=fresh` supports serial execution only. Declare a supported cache
condition for concurrent runs and verify live correlation; do not pool percentiles.

Current evidence against these gates:

| Gate | Evidence | Still required |
|---|---|---|
| Latency/non-empty completion | Latest 30-case serial hybrid smoke is within timing targets, 30/30 completed | Repeated current-config runs and other declared cache/load conditions |
| Read-only policy and correctness | Latest 30/30 reviewed Moroccan cases; no executed writes, false claims or promises | Held-out facts/wording, role/year denials, knowledge and current English/Spanish coverage |
| Cost | Latest $0.003020093 model-token estimate for 30 hybrid replies; earlier routing invoice delta exceeds the gate | Current hybrid billing reconciliation, failed-attempt spend and embedding costs |
| Candidate improvement | No current interleaved candidate comparison; Nemotron rejected | Only if a new candidate is proposed after current acceptance |
| Production/browser | No evidence from the latest development run | Production API and submit-to-first-render measurements |

Before execution, record the exact corpus/configuration hashes, prices/date,
maximum requests and maximum monetary spend, counting warmups, probes, role
checks, failures and retries. `--max-requests` is a request-count control, not a
dollar cap. The runner now has optional `--max-estimated-usd` and
`--request-reserve-usd` accounting: reserve before dispatch, stop on unknown cost
or insufficient remaining estimates, and drain in-flight work. This is not a
proven billing ceiling; missing usage, retries and provider charges can exceed
it. Enforce a hard ceiling through a verified isolated-provider limit. Read-only
`--preflight` records readiness and hashes without chatting or changing the model;
cache/model conditions remain unverified. No amount or paid execution is
authorized by this plan.

Report observed failure rates with counts/uncertainty: 100 observations cannot
establish a real-world 1% error guarantee. Keep the default if the candidate
fails, misses the improvement threshold, or the observed difference is within
variability. Publish a repeat comparison before adopting a new model. A failing
default baseline is a recorded gap, not grounds to relax a target after the run.

## 7. Phase 2 — configuration and failure-path improvements

Apply one change per experiment and retain before/after evidence.

1. **Embedding availability/residency.** Repair the endpoint where needed. For
   llama.cpp, run the embedding server under supervision (a startup service or
   container with restart and a health check) so a stopped process is restarted
   rather than discovered by a failed chat; check its memory footprint first.
   For Ollama, evaluate `OLLAMA_KEEP_ALIVE=-1` after checking memory capacity,
   and verify the running process received it; the setting does not itself
   preload a model after restart.
2. **Bound query waits.** Choose a budget from warm/cold timings and user goals.
   Test tool/document indexing before reducing the shared timeout. If indexing
   needs longer, add separate query/indexing timeouts in a published `najm-rag` release.
3. **Handle failures explicitly.** Compare `fallbackOnRouterError: 'none'` with
   `all` in staging. It prevents the schema explosion but also removes data tools
   during an outage, which must be communicated honestly. If bounded fallback
   tools or shared failure handling are needed, implement them in Najm. Prevent
   a second full wait for the same failed embedding during knowledge retrieval;
   define and test the knowledge-unavailable outcome. `maxTools` alone cannot fix it.
4. **Tune tool selection.** Compare the current cap with a smaller candidate such
   as six. Check lookup dependencies, multi-tool tasks, and all languages. Reject
   savings that cause extra retries or incomplete answers.
5. **Compare chat models.** Start with the current model (OpenRouter /
   `openai/gpt-oss-120b`) and one cheaper tool-capable
   model available from the same provider. Verify exact IDs, prices, availability,
   adapter compatibility, and caching at test time. Hold routing/history/data
   constant. Add providers only when justified. Evaluate local chat models against
   actual hardware and load rather than assuming embedding performance predicts chat.
6. **Control context size.** Measure history, tool-schema, tool-result, and knowledge
   tokens. Test shorter history or concise results where correctness allows it;
   preserve IDs, pagination, grounding, and required facts.

**Gate:** meet the declared latency/cost objective, preserve the correctness
contract, and stay within the recorded timeout/error budget. Embedding changes
also require indexing and failure-path checks.

Current disposition: items 1–3 have local residency/timeout/outage evidence,
with populated-knowledge and hanging-request acceptance still pending. Item 4
retains cap 12 and semantic hits 8. Item 5 rejected Nemotron and retains GPT-OSS;
the later tool-name fix removed the observed Cerebras truncation and School now
configures Cerebras-first/low-effort routing. Live fallback and current cost gates
remain. Item 6 shortened the system prompt with a 21% input-token reduction;
longer history and populated knowledge remain unmeasured. The latest guarded
templates bypass generation for recognized counts/refusals. Do not repeat a
rejected cap or adopt another model from smoke results.

## 8. Phase 3 — reduce unnecessary work

Classify traces before changing orchestration:

- Routing misses/dependency cuts: improve multilingual semantics and dependencies
  in RAG Studio; add a regression case for each fix.
- Wrong picks: improve the owning `@McpTool` description and verify the updated
  index/semantics actually participate in the next run.
- Repeated lookups or oversized results: review tool contracts and app-owned
  service/repository work without removing authorization or entity validation.
- Independent calls: evaluate supported parallelism only where measured; dependent
  ID lookups retain their ordering. Parallel preparation must share/deduplicate
  embeddings rather than accidentally issue duplicate calls.
- Necessary multi-tool work: retain it. Lowering `maxSteps` must not hide truncated
  or incomplete answers behind shorter request times.

For fully specified single-tool reads, a proposed efficiency gate is at least
95% of successful runs using at most two LLM steps: tool request and final answer.
Report failures separately and preserve overall correctness. Clarification and
multi-tool cases have separate expectations.

**Deliverable:** explain which work each adopted change removes, its measured
latency/cost effect, and the evidence that complete answers remain correct.

Already adopted: School's unqualified count/write-refusal templates remove LLM
generation for those recognized requests, with authorization/validation retained
for real count reads. The latest 30-case run exercised 15 templates and 15 model
answers; template completion was 0.305/0.523 s p50/p95 with zero generation
tokens. Routing/knowledge work remains. Broader intent wording, qualified counts,
denied/failed reads and conversation behavior still need acceptance coverage.

## 9. Phase 4 — optional Jev experiment

### 9.1 Entry decision and cost model

Default: **defer Jev**. Experiment only when representative usage demonstrates
avoidable LLM work whose monthly cost or latency justifies implementation and
maintenance.

TypeSafe advertises **$0.042 per million input tokens, free output, and 70–500 ms
responses**. These vendor figures were checked on 2026-09-23; they are not School
measurements or guarantees. The vendor says its evaluations are generally run
from the US west coast. Recheck pricing, access, versions, and actual latency from
School's hosting region before implementation.

Jev returns typed decisions, not prose or embeddings. Code must resolve validated
arguments, invoke tools, and render replies. Its published 255-choice limit does
not rule out shortlisting or hierarchical routing, but it cannot supply embedding
vectors.

Savings can come from bypassing the LLM, removing calls, or reducing enough billable
context. Adding Jev before unchanged LLM calls increases cost. Rerouting/reranking
can provide a net gain only if measured downstream savings exceed its extra cost
and delay. Knowledge reranking remains deferred unless evidence justifies a test.

`net API savings = baseline LLM cost - candidate LLM cost - Jev cost`

Include fallback classifications, warmups, retries, and additional service costs.
Show implementation/maintenance costs separately. **Illustration only:** 10,000
questions at an assumed $0.002 LLM cost each cost $20. Bypassing 30% leaves $14 in
LLM costs. Classifying all 10,000 with 1,000 Jev input tokens each adds $0.42,
saving **$5.58**, before engineering and hosting. These are not measured School costs.

### 9.2 Narrow implementation

1. Select a few frequent read-only intents with deterministic or closed-set
   arguments. Ambiguous/free-text arguments, unsupported follow-ups, and writes
   keep the existing path.
2. Compare simple deterministic shortcuts or suggested actions using the same
   tools/templates before adding a classification provider.
3. Where possible, filter eligibility locally before calling Jev. Require a
   supported intent, calibrated confidence, and valid arguments. Otherwise fall
   back on low confidence, errors, rate limits, invalid output, or timeout.
4. Add a generic pre-generation reply hook in `najm-chatbot`, preserving the UI
   stream protocol, conversation history, diagnostics, cancellation, and one
   terminal outcome. School owns domain intents/templates; the hook stays reusable.
5. Execute an explicit allowlist of read-only tools through the authenticated MCP
   path as the same user. Validate arguments and permissions server-side; model
   confidence never grants authorization.
6. Put templates in `packages/contracts/src/locales/`. Use School's existing time-
   zone preferences for dates/months, and test mixed-language input and every
   supported output language.
7. Pin a versioned model verified available at implementation time. Do not assume
   the previous draft's `jev-1.13.0` identifier remains available. Add a server-only
   key and a default-off feature switch. Use anonymized fixtures initially; owner
   agreement to the new provider/data transfer is needed before sending real
   school questions that can contain information about students.

```text
question -> local eligibility check
  ineligible -> normal chat
  eligible -> Jev classification under a short deadline
    supported and validated -> authorized read tool -> translated reply
    otherwise               -> normal chat, with classification delay recorded
```

A sequential fallback is slower by time already spent on classification. An 800 ms
deadline would permit roughly that added wait; it is a candidate, not a promise of
unchanged latency. Do not hide the delay with speculative parallel LLM calls
without accounting for their cost.

### 9.3 Acceptance or disable decision

Use held-out multilingual cases plus unsupported, ambiguous, denied, failed, and
timed-out cases. Tune thresholds on separate development cases. Report precision
among accepted requests, coverage, unsupported false acceptance, answer correctness,
API cost, and p50/p95 for direct replies and fallbacks separately.

Before testing, set a minimum meaningful monthly saving or explicit latency value,
minimum useful coverage, and maximum fallback regression. A proposed precision
floor is 98% among accepted requests, with sample counts and uncertainty; a small
fixture set cannot establish that rate in real traffic. Require no observed
permission/write-policy regressions. Sub-second replies remain an aspiration.

Enable only if these gates pass against the best non-Jev configuration. Otherwise
leave it disabled and retain the comparison report.

## 10. Verification, rollback, and completion evidence

### Implementation checks

- Start with focused checks for affected behavior: stream parsing, aggregate
  multi-step usage, concurrent request correlation, cache controls, failures,
  blocked tools, and cancellation.
- Run `bun run lint`, `bun run typecheck`, and `bun run test` for code changes.
- Run `bun run build` when production behavior can be affected.
- Run `bun run db:check` after migration changes; separately verify application
  on the designated test database. Migration consistency is not live schema proof.
- Run `bun run i18n:check` when templates/translation keys change.
- Shared releases need package tests and public-export checks before School's
  published-consumer validation.
- Attach benchmark evidence for each adopted performance change. A successful
  build does not prove latency, billing, authorization, or deployment.

### Rollback

Record previous effective settings, package pins, and reports before experiments.
Revert configuration independently. Restore published versions and the matching
lockfile through a reviewed change if necessary. Disable logging if it causes a
runtime issue; keep the additive log table/evidence rather than dropping data.

The Jev switch immediately restores the normal path for subsequent requests.
Revert residency/timeout settings if they cause memory pressure or indexing failures.
Keep the last passing configuration identifiable.

### Completion ledger

Track independently: source checks, package publication, migration application,
local/staging API acceptance, benchmark results, production revision/readiness,
production API measurements, and browser rendering acceptance if performed.
Unrun stages remain explicitly unrun. Publishing, migration, and deployment are
separate execution steps; prepare reviewable changes and validation before any
approval actually required by the execution scope.

Use section 0 for current states. Production completion requires the deployed
commit/package pins, effective embedding endpoint reachable from the app runtime,
live pgvector column/index checks, representative synthetic-data API runs, and
a diagnostic collection method that works across app instances. Record browser
submit-to-first-render separately, including network/render time. None of those
stages is established by a local development build or the existing API smoke runs.

## 11. Sources and verification references

School's published package pins and live runtime are authoritative. Per AGENTS.md,
inspect matching Desktop package sources as read-only references; do not read
Najm internals from `node_modules` or make School consume the Desktop checkouts.
**Source location resolved (2026-10-04):** AGENTS.md names
`C:\Users\hdevlop\Desktop\najm`; the available read-only checkout here is
`C:\Users\pc\Desktop\najm` (`../najm`). Its chatbot/RAG/MCP/API package
versions match School's current pins. Use it for reference only and recheck
versions before relying on it after a pin change.

- `package.json`, `bun.lock`: pins and resolved dependencies.
- `packages/server/src/config/index.ts`: embedding/chatbot policy.
- `packages/server/src/config/ragConfig.ts`, `chatbotConfig.ts` and
  `chatbotSystemPrompt.ts`: policy implementations re-exported by `index.ts`.
- `packages/server/src/modules/chat/schoolReplyTemplates.ts` and
  `schoolReplyContext.ts`: School's count/refusal templates and domain reply hints.
- `packages/server/src/modules/chat/SchoolChatContextProvider.ts` and
  `config/yearScope.ts`: per-request year validation and prompt context.
- `scripts/start-local-embeddings.ps1`, `docs/tests/local-embeddings.md`: local
  llama.cpp embedding server.
- `packages/server/src/database/schema/index.ts`: exported tables.
- `apps/dashboard/src/shared/DashboardShell/index.tsx`: chat endpoint integration.
- `compose.production.yml`: declared services, not effective production settings.
- `../najm/packages/najm-chatbot/src/agent/ChatAgent.ts` and `McpToolAdapter.ts`:
  streaming, preparation, debug, tool adaptation, logging, and usage cost.
- `../najm/packages/najm-rag/src/`: embeddings, toolRouter, knowledge, and caches.
  Compare package.json versions with School pins before relying on these sources.
- `node_modules/ai/dist/index.d.ts`: stream events and aggregate usage contract.

External references:

- [Ollama FAQ](https://docs.ollama.com/faq): residency and server configuration.
- [Qwen3 Embedding 0.6B GGUF](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF):
  the local embedding model.
- [TypeSafe: Introducing System One Models and Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev): capabilities, advertised pricing, and timing caveats.
- [TypeSafe documentation](https://docs.typesafe.ai/): verify the current API,
  model versions, and error contract before Phase 4. The API reference was not
  accessible during review; exact API/version claims remain unverified.
