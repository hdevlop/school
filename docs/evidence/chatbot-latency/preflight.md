# Local routing preflight — 2026-09-30

Outcome: **BLOCKED: embedding service unreachable and tool index empty.**
This records the initial local preflight, not a production inspection or a chat baseline.
The later [llama.cpp smoke check](llama-local-smoke.json) verifies the standalone
embedding service. School package adoption and indexing remain pending; it does
not supersede this app-side baseline.

Source HEAD: `23ba8183940d2dd8d2396732a95c8ad063e4e9af`, with an existing dirty
working tree. Pinned packages: `najm-chatbot@2.0.3`, `najm-rag@2.0.3`,
`najm-mcp@2.2.2`. The running process revision was not independently attested.
Target: `http://127.0.0.1:3102`.

| Check | Observed result |
|---|---|
| App health | HTTP 200, ready; database and cache OK |
| Admin authentication | HTTP 200 using configured local environment |
| Registered tools | 428 reported by the RAG metadata API |
| Indexed tools | 0 |
| Semantic phrases | 0 |
| Dependencies | Empty mapping |
| Embedding configuration | embeddinggemma, 768 dimensions |
| Host Ollama probe | Connection refused at 127.0.0.1:11434 |
| App-side routing preview | HTTP 200 containing router_error; embedding connection refused |
| Effective routing | 12-tool cap, 8 semantic hits, threshold 0.45 |
| Effective fallback | Router error: all; no match: none |
| Knowledge retrieval | Enabled in effective settings; not exercised |
| Fixture structure | All 20 fixtures valid |
| Fixture tool names | All referenced alternatives exist in the live registry |
| Routing matrix | NOT RUN: prerequisites failed; zero scored cases |
| Chat/provider, teacher execution, browser | NOT RUN |

The recorded preview failed in 52 ms. This measures a local refused-connection
failure, not successful routing or LLM latency. An earlier manual preview also
failed (24 ms). Neither is a cold/warm performance comparison.

No Ollama executable was found on PATH or at the usual Windows installation/model
locations. An existing endpoint on another machine has been requested from the
user. No installation, model download, tool indexing, semantic import, settings
change, or school-record mutation was performed. Normal authentication sessions
were created. No paid chat-provider requests were made.

## Interpretation and next steps

Tool selection cannot yet be evaluated meaningfully. A reachable embedding service
alone is insufficient: the tool index also needs initial population. The empty
dependency map means lookup preservation must then be evaluated explicitly.

Use [the runner guide](../../tests/chatbot-routing.md) after connecting embeddings
and indexing tools. Keep those changes separate from model/cap experiments.
OpenRouter credentials can wait until the end-to-end conversation phase.

The preview's empty finalTools on an error does not prove the chat path exposes
zero tools: its implementation differs from ToolRouterService, whose configured
fallback is all. Do not label this diagnostic as actual chat fallback verification.

Raw sanitized local evidence: [routing-preflight.json](routing-preflight.json).
