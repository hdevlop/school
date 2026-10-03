# Local routing trial, 2026-09-30

This was an admin-only routing preview against the local School app. It did not
execute teacher tools, change student or grade records, send chat messages, or use
OpenRouter. The evaluation matrix contains 20 synthetic teacher requests in
English, French, Arabic, Spanish, and mixed Darija.

## Integration and database readiness

`najm-rag@2.1.0` was published from Najm commit
`23d5a636c9a3f914c17b2d7755b97e07b298eb21`. The tarball SHA-256 was
`58b4baea3cd0a62f5b7515c572944866084cc887b30efd4411f62b28d0756e06`;
npm registry integrity verification and a tarball HTTP 200 passed before School
installed the exact pin. The local EmbeddingGemma server uses llama.cpp b11146.

School's local PostgreSQL database had three empty RAG embedding tables with
`real[]` columns and no pgvector extension, although migration 0014 declares
`vector(768)`. A direct preview failed with PostgreSQL error `42704` (`type
"vector" does not exist`). We verified all three tables contained zero rows,
then enabled the available pgvector 0.8.6 extension and converted their embedding
columns to `vector(768)` in one transaction. The document HNSW index was created
if absent. Subsequent preview succeeded. This was a **local database repair**;
`db:check` validates migration files but did not detect the live schema mismatch.

The admin `POST /api/chatbot-rag/index-tools` request indexed all 428 registered
tools. The resulting index contains EmbeddingGemma vectors. This index must be
rebuilt if the model, quantization, or query/document prefixes change.

## Baseline

[Raw routing report](routing-post-index.json): **4/20 passed** the minimum tool
selection checks. All four passing cases asked to read today's attendance.
Attendance writes, grade reports, and grade entry mostly returned `fallback_none`
at the current similarity threshold of 0.45. The English grade-report tool scored
0.416, attendance write scored about 0.32 in English/French/Spanish, and the
Arabic grade-report tool scored 0.105 against its tool-description vector.

## Phrase experiment and rollback

Fourteen general teacher-task phrases were imported for three target tools, with
explicit student/assessment lookup dependencies. No phrase was copied from the
evaluation corpus. [The phrase set](rejected-semantic-phrases.json) and
[raw trial report](routing-with-phrases.json) are retained for diagnosis.
The result dropped to **3/20**: attendance read queries selected the attendance
write tool because its phrase scores were high, while most write and multilingual
grade cases remained below threshold. The imported phrases and their temporary
routing-settings row were removed after verifying they were the only records
affected. Lowering the threshold alone would also admit unrelated tool matches,
as [nearest-neighbor scores](routing-scores.json) show.

## Qwen comparison and final local configuration

The [official Qwen3 Embedding 0.6B Q8 GGUF](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF)
was tested on another loopback llama.cpp port. It returned 1024 dimensions even
when asked for 768. Published `najm-rag@2.1.1` adds opt-in Matryoshka shortening
and normalization (Najm commit `409f1dd7adbad9e9bc15dcc9a395d719144d21ab`;
tarball SHA-256 `00c0635e6040942ab9dd8b13d22ebfb91f8c42ca971f18a71b15c8f6aa7df4c0`).
The 223 package tests, build, public API check, registry integrity, and tarball
HTTP 200 passed before School adopted it.

[Direct Qwen ranking](qwen-direct-trial.json) embedded all 428 tool descriptions
outside School's router. Using 768 shortened dimensions, the intended primary
tool ranked in the top 12 for **16/20** cases, while every required tool group
ranked in the top 12 for only **6/20**. The local mean direct query call took
about 529 ms after model loading. This is model comparison evidence, not router
acceptance or VPS timing.

School reindexed all 428 tool vectors after switching models. Tool fingerprints
do not include model configuration, so the existing fingerprints were deliberately
invalidated before the normal index API regenerated vectors. The Qwen
[initial router preview](routing-qwen.json) passed **11/20**. Clearer MCP
descriptions for grade report/create raised this to **12/20** in
[the description trial](routing-qwen-descriptions.json). Explicit student and
assessment lookup dependencies are configured in School, but only the primary
selected tool's lookup graph is useful when a request picks the wrong primary.

A second phrase trial added nine grade phrases under Qwen. It improved several
grade cases but redirected previously passing attendance cases to grade tools;
[the report](routing-qwen-grade-phrases.json) passed **10/20**. Those phrases
were removed. [The final check](routing-final.json) confirms **12/20**, with
428 indexed tools and zero semantic phrases. Its eight misses include multilingual
grade reports, some grade entry requests, Darija attendance, a mixed grade query,
and a topic switch. The final preview's endpoint implementation still differs
from the chat router on dependency expansion and error fallback.

The next shared Najm issue is semantic phrase arbitration: any above-threshold
phrase match excludes tool-description matches, while selecting the primary tool
sums several phrase scores for one tool. This let repeated general phrases
overrule stronger intent-specific matches. Query/context handling and executable
confirmation also need separate work before a teacher can rely on AI alone.

No claim about teacher permissions, executable confirmation, photo extraction,
chat latency, or VPS performance follows from these previews.

## Validation and runtime state

School lint, typecheck, Najm pin tests, fixture validation, migration-file check,
and a production build passed. The production build used
`NAJM_NEXT_DIST_DIR=.next-chatbot-verify` to avoid the running dev server's
`.next` cache. The first default build attempt collided with that cache and was
stopped before compilation; the dev server was restarted afterward. Local app
health returned HTTP 200 with database/cache OK, Qwen health returned ready, and
the final 12/20 preview was repeated successfully after restart. The production
build is a source/build gate, not a deployment.

## Re-run on the second workstation, 2026-10-02

The sections above ran on the original workstation (llama.cpp at
`%LOCALAPPDATA%\SchoolAI`). This workstation (`C:\Users\pc`) had no llama.cpp
install, no Qwen model and no `RAG_EMBEDDING_*` variables, so the app was using
the source default: Ollama 0.35.0 serving `embeddinggemma:latest` (BF16, no
query/document prefixes). Its 430 tool vectors had been built that day with
that model. pgvector 0.8.6 was present and all three embedding columns were
already `vector(768)`; no repair was needed. The registered tool count is now
430 (it was 428).

| Configuration | Report | Passed | Preview HTTP time |
|---|---|---:|---|
| Ollama EmbeddingGemma BF16, as found | [routing-ollama-gemma-20261002.json](routing-ollama-gemma-20261002.json) | **6/20** | 59–254 ms, one 1,490 ms; first call 4,256 ms |
| Ollama Qwen3 Embedding 0.6B Q8_0, current School instruction | [routing-qwen-20261002.json](routing-qwen-20261002.json) | **14/20** | 168–650 ms; first call 630 ms |

For the Qwen run, `qwen3-embedding:0.6b` (Q8_0, 639 MB, the same quantization
as the pinned GGUF) was pulled into Ollama and aliased to `qwen3-embedding` so
School applies its Qwen instruction ("…fulfills the user request", commit
`b96c55f`). `.env.local` selects `openai-compatible` at
`http://127.0.0.1:11434/v1` with `RAG_EMBEDDING_TRUNCATE_DIMENSIONS=true`;
Ollama itself honors `dimensions: 768` and returns unit-length vectors. The dev
server was restarted, all 430 fingerprints were set to a sentinel value (index
data only), and the admin `POST /api/chatbot-rag/index-tools` rebuilt 430/430 in
313 s. No semantic phrases or school records changed.

Still missing with Qwen: French and Arabic grade reports, Spanish grade entry,
Darija attendance, the mixed Darija/French grade query and the topic switch.
All 20 previews returned `routed`; several picked teacher-dashboard tools as
the primary. Attendance and grade-entry cases that pass now include their
lookup dependencies.

14/20 is not directly comparable with the earlier 12/20: the server
(Ollama, not llama.cpp), the machine, the query instruction, the tool
descriptions and the tool count all differ. It is the current routing number
for this workstation's configuration. Preview timing is HTTP time on an
unloaded local machine, not chat latency.
