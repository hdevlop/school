# Production embedding server plan

Status: **proposed, not applied.** `compose.production.yml` has no embedding
service, and the production image's defaults point najm-rag at
`http://127.0.0.1:11434`, inside the app container, where nothing listens.
Unless the production environment already sets `RAG_EMBEDDING_*` to a working
endpoint (not visible from the repository), every chat question fails tool
routing. Since `najm-rag` 2.2.0 / `najm-chatbot` 2.1.1 that failure is fast and
honest (the assistant says the data cannot be reached); before, it ended the chat
as `setup_error` (the historical latency plan, Phase 2 items 1–3; recoverable from
Git). Current chatbot work follows the
[Jev + router plan](CHATBOT-JEV-ROUTER-PLAN.md).

Pushing to `main` deploys production (`.github/workflows/deploy-production.yml`),
so this plan is applied by an operator, in the order below.

## Choice: llama.cpp server with a pinned model file

| | llama.cpp server (proposed) | Ollama |
|---|---|---|
| Network | None: reads a file from the host | Pulls the model on first start, so needs egress the `backend` network denies |
| Residency | Loaded for the life of the process | Unloads after 5 idle minutes unless `OLLAMA_KEEP_ALIVE` is set |
| Pinning | Image digest plus model file SHA-256 | Tag names, moved by updates |
| Health | `GET /health` | `GET /api/version` (does not prove the model loads) |

Both serve the same model, Qwen3 Embedding 0.6B Q8_0, through an
OpenAI-compatible `/v1/embeddings`; the local workstations use both.

## 1. Host preparation (once, on the VPS)

```sh
sudo install -d -m 0755 /srv/school/models
cd /srv/school/models
sudo curl -fL -o Qwen3-Embedding-0.6B-Q8_0.gguf \
  https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/370f27d7550e0def9b39c1f16d3fbaa13aa67728/Qwen3-Embedding-0.6B-Q8_0.gguf
echo "06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439  Qwen3-Embedding-0.6B-Q8_0.gguf" | sha256sum -c -
```

639,150,592 bytes; the revision and checksum match `docs/tests/local-embeddings.md`.

**Memory.** The VPS has 6 GB and 4 cores. A local Qwen llama.cpp process held
about 1.2 GB with a 2,048-token context. Check `free -m` with the current stack
running before adding it; the limit below caps it at 2 GB.

## 2. Compose service

Add under `services:` in `compose.production.yml`:

```yaml
  # Tool routing embeddings. Reads a pinned model file from the host; no egress.
  embeddings:
    image: ghcr.io/ggml-org/llama.cpp:server-b11146@sha256:a94b642b3e2620749bf2ff5672df922c23a6202710e54a8f7667e58df70aba5a
    restart: unless-stopped
    command:
      - -m
      - /models/Qwen3-Embedding-0.6B-Q8_0.gguf
      - --embeddings
      - --host
      - 0.0.0.0
      - --port
      - "8080"
      - --threads
      - "2"
      - --threads-batch
      - "2"
      - --parallel
      - "1"
      - --ctx-size
      - "2048"
      - --batch-size
      - "2048"
      - --ubatch-size
      - "2048"
      - --alias
      - qwen3-embedding
    volumes:
      - type: bind
        source: ${SCHOOL_MODELS_HOST_PATH:-/srv/school/models}
        target: /models
        read_only: true
        bind:
          create_host_path: false
    networks:
      - backend
      - default
    mem_limit: 2g
    init: true
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://127.0.0.1:8080/health"]
      interval: 15s
      timeout: 5s
      start_period: 60s
      retries: 4
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: "5"
```

The app does **not** `depends_on` it: a failed embedding container must not keep
the school offline. The chat already degrades honestly without it.

## 3. App environment (Dokploy)

```sh
RAG_EMBEDDING_PROVIDER=openai-compatible
RAG_EMBEDDING_BASE_URL=http://embeddings:8080/v1
RAG_EMBEDDING_MODEL=qwen3-embedding
RAG_EMBEDDING_TRUNCATE_DIMENSIONS=true
```

The model name must be exactly `qwen3-embedding`: School applies its Qwen query
instruction only for that name. Timeouts keep School's defaults (questions 5 s,
indexing 60 s, 30 s fail-fast window).

## 4. Indexing

On boot najm-rag indexes every routable tool in the background (`indexOnBoot`).
On this CPU class that takes minutes: 151 s for 431 tools in batches of 16 on
the local i7; School uses batches of 4. If the app starts before the embedding
server is healthy, boot indexing fails and is logged. Re-run it from RAG Studio
(re-index tools) or restart the app once `embeddings` is healthy. najm-rag 2.1.4+
re-indexes everything when the model or dimensions change.

## 5. Verification after deploy

1. `docker compose ps embeddings` is healthy; `docker stats` shows its memory.
2. From the app container:
   `bun -e "const r=await fetch('http://embeddings:8080/v1/embeddings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'qwen3-embedding',input:'ping'})});console.log(r.status)"` prints 200.
3. App logs show tool indexing complete.
4. In the dashboard chat, "How many students are enrolled this year?" answers
   with a number. The chat diagnostics record `routingStatus: routed`.

## Rollback

Remove the four `RAG_EMBEDDING_*` variables and the service. The chat returns to
answering that the data cannot be reached; nothing else depends on it.
