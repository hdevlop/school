# Tool arguments reach the model; three follow-up fixes — 2026-10-03 (night)

## The finding

Until `najm-chatbot` 2.1.2, every chat tool reached the model with an empty
argument schema. `buildAiSdkTools` passed the schema as `parameters`; AI SDK 6
reads `inputSchema`. A logging proxy put in front of OpenRouter (the saved AI
settings' base URL, restored afterwards) showed School's tools going out with
no properties and no required fields, search included. The model guessed
argument names from descriptions: argument-less tools always worked, search
mostly did, and id-based tools often got `{}` and looped to the 10-step limit.
Direct OpenRouter probes with the real schemas, streamed and not, passed every
time. Details and the role checks: [roles-20261003.md](roles-20261003.md).

## Runs after the fix

All on the dev server, saved model `openai/gpt-oss-120b`, default OpenRouter
route, one run each, sequential (not interleaved), so model-time differences
between rows are mostly the host's.

| Run | Checks | Input / output tokens | Complete p50 / p95 | Model time p50 / p95 |
|---|---|---|---|---|
| Earlier today, before 2.1.2 ([json](model-nitro-full50-20261003.json), baseline half) | 50/50 | 163,297 / 14,026 | 3.5 s / 12.3 s | 3.5 s / 12.3 s |
| 2.1.2 ([json](full50-chatbot-2.1.2-20261003.json)) | 49/50 | 244,921 / 13,511 | 6.2 s / 14.4 s | 6.0 s / 14.2 s |
| + search only for named students ([json](full50-search-only-20261003.json)) | 47/50 (one was the language check) | 168,891 / 13,145 | 5.2 s / 12.0 s | 5.0 s / 11.6 s |
| + language reminder: final ([json](full50-final-20261003.json)) | **50/50** | 177,745 / 13,447 | 8.5 s / 24.3 s | 8.3 s / 24.3 s |

School's own preparation stayed at 0.16 s p50 and 0.27 s p95 in the final run.
Steps per answer stayed at 2 (p50) and 3 (p95) in every run. The final run's
slower model time comes with the same tokens and steps as the run an hour
before; it was taken late in the evening and is not attributed to the change.

## Follow-up fixes

1. **The full student list as a fallback.** With real schemas, one blocked
   grade question found no student by search and then read
   `students_get_students`: 112k characters, 52k input tokens on its last step,
   75.7k for the answer. The per-student routing dependencies now bring search
   only; class-wide questions still reach section and class student tools.
   Input tokens for the 50 went from 244,921 to 168,891; none above 15k since.
   The older `routing-cases.json` groups accept search as the student lookup;
   routing stayed 18/20 and 30/31 with the same three known misses.
2. **Reply language after an English tool result.** Spanish and Darija
   questions were sometimes answered in English after an English refusal or
   an empty search. A closing line now repeats the language rule. On the 12
   non-English questions whose tool results are English
   ([language-risk-cases.json](../../../datasets/chatbot-latency/language-risk-cases.json)),
   asked three times each: 2 of 36 wrong before
   ([json](language-before-reminder-20261003.json)), 0 of 36 after
   ([json](language-after-reminder-20261003.json)). Small samples.
3. **The language check misread a Spanish list** whose items gloss classes in
   French after a dash (`- **CP** – Cours Préparatoire (secciones A, B, C)`).
   Glosses after a bold label are now ignored, like table data rows.

## Seen once, not fixed

In the 2.1.2 run the Arabic announcement answer said the announcement had been
created although `announcements_create` was blocked; the earlier and later
runs answered it correctly. The scorer does not detect a false success claim.
