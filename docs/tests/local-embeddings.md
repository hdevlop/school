# Local embeddings with llama.cpp

This service selects relevant tool descriptions. It does not generate chat replies
or read grade-sheet photos. OpenRouter chat and image tests remain separate.

## Installed Windows setup

Files live outside the repository in `%LOCALAPPDATA%\SchoolAI`:

| Artifact | Pinned source | SHA-256 |
|---|---|---|
| CPU server, extracted into `llama-b11146` | [llama.cpp b11146 Windows CPU x64](https://github.com/ggml-org/llama.cpp/releases/download/b11146/llama-b11146-bin-win-cpu-x64.zip) | `14cf1303ca9ac3abd94816850532f9f9a69ac66fbaca3776fc6f9061c2fac1d1` |
| `embeddinggemma-300M-Q8_0.gguf` (333,590,944 bytes) | [GGUF at pinned revision](https://huggingface.co/ggml-org/embeddinggemma-300M-GGUF/resolve/0f741b5a6585bd53aeb15cd1372c56f2a0f65e12/embeddinggemma-300M-Q8_0.gguf) | `b5ce9d77a3fc4b3b39ccb5643c36777911cc4eb46a66962eadfa3f5f60490d63` |
| `Qwen3-Embedding-0.6B-Q8_0.gguf` (639,150,592 bytes) | [Official Qwen GGUF at pinned revision](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/370f27d7550e0def9b39c1f16d3fbaa13aa67728/Qwen3-Embedding-0.6B-Q8_0.gguf) | `06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439` |

For a fresh machine, download these files, check them with `Get-FileHash -Algorithm
SHA256`, and extract the server archive into the directory above. The launcher does
not download or upgrade binaries.

From the School root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local-embeddings.ps1 -Model Qwen3
Invoke-RestMethod http://127.0.0.1:18081/health
```

The launcher uses two CPU threads, no GPU layers, one parallel request, and a
2,048-token context. It binds only to loopback. Repeated starts reuse the recorded
process after checking its executable and health. Qwen uses `qwen.pid` and port
18081; EmbeddingGemma uses `server.pid` and port 18080. Logs live in
`%LOCALAPPDATA%\SchoolAI`. This is a manually started process, not a Windows service.

To stop it, check the recorded process before stopping:

```powershell
$embeddingRoot = Join-Path $env:LOCALAPPDATA 'SchoolAI'
$embeddingProcess = Get-Process -Id ([int](Get-Content (Join-Path $embeddingRoot 'qwen.pid')))
if ($embeddingProcess.Path -ne (Join-Path $embeddingRoot 'llama-b11146\llama-server.exe')) {
  throw 'Recorded PID belongs to another executable.'
}
$embeddingProcess | Stop-Process
```

## School integration status

Published `najm-rag@2.1.1` supports the server's OpenAI-compatible embedding API
and opt-in shortening for Matryoshka models. Its 223 package tests, build, public
API check, release pack, npm integrity check, and School pin test passed. The
source commit is `409f1dd7adbad9e9bc15dcc9a395d719144d21ab` in the isolated
`najm-embeddings` worktree. School pins the published version exactly.

The local adapter configuration is:

```typescript
embedding: {
  provider: 'openai-compatible',
  baseUrl: 'http://127.0.0.1:18081/v1',
  model: 'qwen3-embedding',
  dimensions: 768,
  batchSize: 4,
  truncateDimensions: true,
  queryPrefix: 'Instruct: Retrieve the school management tool that fulfills the teacher request.\nQuery: ',
  documentPrefix: '',
}
```

The instruction format follows the [Qwen model card](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B).
llama.cpp b11146 ignores the request's `dimensions` field and returns 1024 values;
the opt-in adapter takes the first 768 and normalizes them. Qwen supports
Matryoshka dimensions. An embedding model, quantization, or prefix change requires
rebuilding generated tool and phrase embeddings; tool fingerprints do not include
these settings. Keep this configuration on the server. No OpenRouter API key is
needed for this local service.

## Evidence and remaining work

[EmbeddingGemma smoke evidence](../evidence/chatbot-latency/llama-local-smoke.json)
records eight queries against three synthetic descriptions. The full School
preview passed 4/20 cases with it. A [direct Qwen trial](../evidence/chatbot-latency/qwen-direct-trial.json)
ranked the requested primary tool within the top 12 for 16/20 cases after
shortening to 768 dimensions. Direct query calls took 222–1,232 ms on this PC,
averaging about 529 ms. This direct ranking omits router selection and dependencies.

The test ran on the local i7-7700K, not the 6 GB / 4-core VPS. A Qwen process
snapshot showed about 1.16 GB working set, not a peak memory measurement or
capacity guarantee. No VPS service has been installed. School's 428 tools were
reindexed after a local database repair. The [final routing trial](../evidence/chatbot-latency/routing-trial.md)
passed 12/20 minimum selection checks, so this configuration is not yet suitable
as the sole teacher workflow interface.
