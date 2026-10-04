# Same-model faster-route comparison — 2026-10-04

Execute only once the corrected 30-case GPT-OSS run passes all checks.
Keep GPT-OSS 120B; compare default `openai/gpt-oss-120b` against
`openai/gpt-oss-120b:nitro` with the same saved OpenRouter key.

This tests a provider-routing choice, not a replacement model. The earlier
legacy Nitro comparison failed; updated prompt/facts and Morocco-specific
checks justify measuring it again without treating old results as acceptance.

30 identical cases, one serial interleaved pair each (maximum 60 outer requests),
same frozen Moroccan corpus, prompt/scoring hashes, admin/year 2026-2027,
fresh query/knowledge caches and matching model/request diagnostics. No warmups.
$1 client estimate stop, $0.01 reservation, candidate fallback pricing file.
Restore the saved default model in `finally`; verify settings afterwards.
No adoption or domain data writes. This finishes the recorded 150-request ceiling.

Current base-model and endpoint metadata were captured from OpenRouter APIs in
`morocco-nitro-prices-20261004.json`. Nitro is a routing suffix, not a separate
catalog entry. [OpenRouter's primary documentation](https://openrouter.ai/docs/guides/routing/model-variants/nitro)
states that it sorts by throughput and admits priority-tier endpoints. Actual
host/tier and prompt caching are uncontrolled; rates may differ by endpoint.

If installed prices are missing, declare $0.70/$1.90 per million input/output
tokens, twice the largest captured tool-capable endpoint rates ($0.35/$0.95).
This is headroom, not a billing cap or actual invoice. The runner preserves
installed metadata when pricing is present and keeps fallback estimates separate.
Installed/catalog cost estimates cannot establish Nitro's real endpoint bill.
Retain every quality failure; compare speed only alongside those checks.

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --base-url=http://localhost:3104 --repeat=1 --max-requests=60 --concurrency=1 --cache-mode=fresh --max-estimated-usd=1 --request-reserve-usd=0.01 --pricing-file=docs/evidence/chatbot-latency/morocco-nitro-declared-prices-20261004.json --compare-model=openai/gpt-oss-120b:nitro --keep-text --output=docs/evidence/chatbot-latency/morocco-nitro60-20261004.json
```
