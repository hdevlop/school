# Najm Moroccan reply policy: 30/30

All 30 original Moroccan cases completed and passed their original checks on
2026-10-04. Every reply was reviewed. There were no failed replies to rescore,
no corpus changes for this run and no model switch. OpenRouter
`openai/gpt-oss-120b` was selected before, during and after the run.

Raw evidence: [30 replies and diagnostics](najm-reply30-20261004.json),
[fresh School facts](najm-reply-facts-20261004.json),
[ready preflight](najm-reply-ready-restarted-20261004.json),
[postflight](najm-reply-after-20261004.json),
[request and budget plan](najm-reply-plan-20261004.md).

## Implementation and distribution

Najm provides opt-in request-specific language selection and instructions, using
the latest user message rather than retrieved data or conversation history.
Its shared template executor allows only available, explicitly read-only tools,
uses the existing tool guards and argument validation, and refuses to fabricate
facts when a read fails. Streaming, memory and diagnostics support both paths.
The policy does not depend on GPT-OSS or a particular provider.

School supplies translated templates for unqualified student/teacher totals
and blocked school writes. Counts come from real authorized tools with the
validated academic year. Qualified or unfamiliar requests remain on the model
path; missing/invalid counts never become zero. School's knowledge retrieval
continues to use the routing text while reply instructions use the latest text.

Published package: `najm-chatbot@3.3.0`, Najm commit
`48098814101ea070732c03739f434f22a00e0e5b`.
Registry integrity:
`sha512-UWV0GDf5CUm4m0dpJ6c0LLBMu6ZVSGLtQwbk3ZRfwEqfWiU9S753RNouIat3qccGREauGhB91/ZC92lutKoUsw==`.
The published tarball SHA-1 matches the registry:
`2ff0ebc345566f520bc99e2ff5ce29c7ec876b7e`.
School's root, dashboard and server use exact published pins, with an updated
Bun lockfile. No checkout link or copied framework source is used by School.

## Review

| Case group | Cases | Reply source | Review |
| --- | ---: | --- | --- |
| Greetings | 3 | GPT-OSS | Requested language/register; no school fact invented |
| Student, teacher and combined totals | 9 | Template | Returned totals 100/50; combined requests executed both reads |
| Classes | 3 | GPT-OSS | Correct existing class rows and preserved names |
| Today's attendance | 3 | GPT-OSS | Empty read reported without inventing attendance |
| Upcoming exams | 3 | GPT-OSS | Correct next five exam rows and dates |
| Missing student | 3 | GPT-OSS | No invented student record |
| Blocked writes | 6 | Template | Localized refusal; no write call, promise or false completion claim |

Each language has 10/10 passes. Automated checks found zero wrong languages,
mixed languages, wrong registers, factual failures, wrong tool arguments,
false write claims, write promises or unresolved reviews. All 30 requests have
correlated diagnostics and verified fresh application cache conditions. There
were 24 executed read tools and no writes.

Manual wording observations remain: the Arabic greeting repeats equivalent
student nouns, the Darija greeting uses an awkward phrase involving school
"harvest", and Arabic attendance says today's attendance is unavailable rather
than explicitly saying the successful read returned no rows. These did not
change the language/register or fact checks. This is evidence for consistency
on this corpus, not native-speaker fluency or a guarantee for every future model.

## Timing and scope

| Path | Requests | First text p50 / p95 | Completion p50 / p95 |
| --- | ---: | --- | --- |
| All replies | 30 | 523 / 1234 ms | 523 / 1345 ms |
| GPT-OSS generated replies | 15 | 913 / 1477 ms | 951 / 1584 ms |
| Templates | 15 | 305 / 523 ms | 305 / 523 ms |

Templates used zero generation tokens but still performed routing and, for
counts, guarded reads. Do not interpret their latency as GPT-OSS generation
speed. No new Nitro comparison was performed. SDK model-token cost estimate
was $0.003020093; this is not a complete invoice including embeddings.

The run was serial, with fresh sessions, on an isolated published-dependency
checkout at port 3171. The runner held the shared benchmark lock and checked
the configured model before each request. This lock is cooperative: older
runners or other settings writers are not prevented from changing settings.
No competing benchmark ran. Source hashes for all three reply/context files
match the working School checkout after the run. Fresh facts matched the
existing corpus (100 students, 50 teachers, 9 classes, 12 exams).

## Verification

Najm: 232 package tests passed, including language switching, five simulated
providers, streamed templates, failed/denied reads, memory, and real HTTP/MCP
authorization boundaries. Package build and public API checks passed; the
release repeated its required gates.

School: focused reply/context/year tests passed; the final template regression
suite passed 25 tests. Benchmark CLI, corpus regressions and lock tests passed.
Workspace typecheck, lint and production build passed. The full School test
suite was not run. The final production build includes the attached Arabic
conjunction regression fix used by the successful live run.

The initial unavailable-app preflight and a subsequent isolated development
HMR failure sent no paid chat requests. Restarting only the isolated server
resolved readiness before the single 30-request run. All preflights are retained.
