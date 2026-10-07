# Jev transport check and new stress batch — 7 October 2026

The public network check completed, and a new 304-question batch is ready for wording review. No paid Jev classification requests, credentials, School tools or production changes were involved. The previous classifier benchmark remains **511.4 ms mean / 729.7 ms p95**, with one retained transport failure; this work does not replace those measurements.

## Public metadata network comparison

[Raw report](jev-transport-metadata-20261007.json): 36 serial GET requests to the same public Jev provider-metadata endpoint, 12 per client, rotating forward/reverse order, one-second pacing, ten-second timeout and no retries. Every response was HTTP 200 with a 1,170-byte body. No tests/builds ran during timing.

| Client | Successful / attempts | Mean | Median | p95 / maximum |
| --- | --- | --- | --- | --- |
| Bun default reuse | 12 / 12 | 122.0 ms | 69.1 ms | 518.8 ms |
| Bun reuse disabled | 12 / 12 | 130.4 ms | 126.9 ms | 157.2 ms |
| curl, new process per GET | 12 / 12 | 169.5 ms | 167.8 ms | 278.6 ms |

With only 12 samples per client, nearest-rank p95 equals the maximum. Bun default has the lowest median but a late 519 ms outlier, so the tail cannot be dismissed as first-request setup. Both Bun modes had no observed failures in this small metadata cohort; that does not prove either fixes the previous classification socket failures.

curl's average recorded phases were DNS 26.4 ms, TCP 33.8 ms, TLS 48.0 ms and post-setup-to-first-byte 61.0 ms. These are cumulative-timer differences, not Jev model queue/compute measurements. The installed curl used HTTP/1.1; its build has no HTTP/2 feature. Bun's actual protocol was not captured. A fresh curl process also has different connection/DNS reuse behavior, so this is not a pure library comparison. Timer definitions follow the [official curl manual](https://curl.se/docs/manpage.html). Bun's default pooling and `keepalive: false` behavior follow its [fetch documentation](https://bun.com/docs/runtime/networking/fetch).

**Conclusion:** ordinary public GET access was available, with materially lower typical latency than the earlier authenticated classifier POST. The endpoints and workloads differ, so subtracting these averages would not isolate classifier computation. There is insufficient evidence to choose a production transport or attribute the remaining latency to Bun, OpenRouter or Jev. Keep the last measured reuse-disabled profile for the optional next stress run; no application transport setting was changed.

## New reviewable corpus

- [Wording review](../../tests/jev-fresh-stress304-review.md): 76 Darija/Arabizi pairs, followed by their French/standard Arabic versions. The owner can approve the batch or send numbered corrections without writing JSON or labels.
- [Corpus](../../../datasets/chatbot-latency/jev-fresh-stress304-20261007.json): 304 assistant-authored questions, 76 per language style, with provisional labels and fictional entities only. New wording review remains pending; the earlier “done” applies to the original 100 cases.
- [Freshness evidence](jev-fresh-stress304-preparation-20261007.json): canonical duplicates checked against nine prior corpora, including the reviewed 100 and its regression copy. No exact/canonical overlap was found. Lexical freshness does not establish independent semantic or native evidence.
- [Offline audit](jev-fresh-stress304-audit-20261007.json): 17 language abstentions, 59 deterministic write refusals and zero baseline/provisional-label disagreements. There are 228 classifier-eligible cases under the assumed admin first-turn context: 78 supported reads, 55 write requests and 95 unsupported cases. No classifier accuracy was measured.

The batch includes 80 supported read/small-talk cases, eight upcoming-exam cases excluded from the core policy, 120 writes across 30 action/domain families per style, and 96 qualified/arithmetic/how-to/negated/quoted/prompt-like/follow-up negatives. Of the 120 writes, 59 receive a deterministic refusal, six have unknown language and 55 remain classifier-eligible. That is a coverage gap, not an observed unsafe execution. All 96 negatives fall through the current baseline. Some Arabic-script Darija is detected as standard Arabic; this remains visible in the audit.

**This is a safety stress batch, not the originally proposed 200-family qualification corpus.** Translations and unqualified read paraphrases are clustered conservatively into 61 semantic groups: six supported read groups, one upcoming-exam group, 30 write groups and 24 negative groups. At most 36 supported groups could satisfy the current core policy. It cannot meet the 150-family gate even with perfect classification. Creating new IDs for synonymous count requests would inflate the family statistic; the larger qualification requirement stays open. No framework hook or full-chat integration was added.

## What we can do next

The [concrete optional classification proposal](jev-fresh-stress304-plan-20261007.json) is one pass of **at most 304 requests with a $0.05 client stop**, reserving $0.00015 before each request ($0.0456 across all slots), two-second pacing, no retries, core policy and semantic guard v3. It is not authorized or run. Review the new wording and explicitly approve that new allowance to run it; both earlier 100-slot allowances are exhausted. Approximate nominal serial duration is 13 minutes based on the previous mean plus pacing, with failures or budget stops possibly shortening the run. Unknown cost stops dispatch and remains reserved; the client stop is not a provider billing guarantee.

Use that run to identify safety disagreements and compare the four styles. If we tune against these questions afterward, retain them as development/regression evidence rather than claiming a new blind test. Runtime adoption still requires the supported published async hook and a full-chat readiness comparison; additional synthetic question volume alone cannot complete those gates. Jev remains off.

Verification: offline probe validation passed; two focused tests passed (13 assertions), including failed-sample accounting, clustering, duplicate rejection and rejection of approval bound to another batch. Repository lint passed. No production source/configuration changed, so no new production build was necessary. The transport runner was hardened after the measured run to create output exclusively and use `import.meta.main`; the executed version hash is preserved in the verification artifact, and no network run was repeated.
