# Full Moroccan-style question draft

The collection contains **960 assistant-written questions**, with 240 per style:
French (`fr`), Modern Standard Arabic (`ar`), Darija in Arabic script (`ary`) and
Arabizi (`ary-latn`). The four language versions of each scenario share a family
ID. All labels are provisional assistant assessments; human review is pending.

| Intent | Synthetic family groups | Questions |
|---|---:|---:|
| Student count | 30 | 120 |
| Teacher count | 30 | 120 |
| Both counts | 25 | 100 |
| Class list | 25 | 100 |
| Today's student attendance | 25 | 100 |
| Small talk | 15 | 60 |
| Write requests | 30 | 120 |
| Needs the model | 50 | 200 |
| Upcoming exams, excluded by core policy | 10 | 40 |
| Total | 240 | 960 |

The table describes the authoring scenario groups. A subsequent assistant review
corrected one context-free French combined-count variant to `needs_llm`; current
labels contain 99 combined-count and 201 `needs_llm` questions. The original
wording is retained and its family remains linked to the other three translations.

The 150 core-supported groups meet the draft's planned structural coverage,
and each style has 30 write examples. Those counts are synthetic groupings from
one author, not statistically independent human observations or model-accepted
questions. The draft includes teacher-name/count distinctions, qualified counts,
past years, specific students, attendance dates, fees/grades, follow-ups,
how-to versus execution, negated mutations, quoted commands and mixed requests.

Files:

- [Working collection](../../datasets/chatbot-latency/jev-native-collection.json):
  full provenance records, all `source: assistant`, `split: dev`, with pending
  human review and no native-fluency declaration. Native export stays blocked.
- [Development corpus](../../datasets/chatbot-latency/jev-moroccan-development.json):
  the same text and labels in the separate `fresh-exploratory` format. Its
  `test` split is for synthetic exploratory scoring, not native acceptance.
- [V3 blind worksheet](../../datasets/chatbot-latency/jev-moroccan-review-worksheet-v3.json):
  opaque IDs/families and hashed order hide metadata hints; initial labels,
  author/split metadata and model results are omitted. Reviewer identity/time/
  declarations must come from an actual independent review.
- [Legacy v2 worksheet](../../datasets/chatbot-latency/jev-moroccan-review-worksheet.json):
  retained as history. Its original IDs expose intent names, so it must not be
  used for blind review and the importer now requires a v3 worksheet.
- [Authoring source](../../datasets/chatbot-latency/jev-moroccan-authoring.mjs):
  hand-written four-language rows used to build these artifacts.

Validate without a key or network calls:

```powershell
bun scripts/chatbot-jev-draft.mjs --validate
bun scripts/chatbot-jev-probe.mjs --cases=datasets/chatbot-latency/jev-moroccan-development.json --acceptance-policy=core --validate
bun scripts/chatbot-jev-native-intake.mjs --cases=datasets/chatbot-latency/jev-native-collection.json --check
```

The first two commands pass structural/freshness checks. The intake check exits
1 because this dev-only AI draft has no native held-out review evidence. It
does not authorize a paid run or Jev enablement. `--write` preserves existing
output/history and refuses to replace a populated working collection.

No duplicate canonical text or copied queries were found against the four
earlier corpora. Lexical freshness is narrower than conceptual independence.
The development corpus is now the fifth registered seen corpus, preventing its
questions from being relabeled as new native held-out cases. Original failed
Jev results remain, and runtime integration stays off.

[Verification results](../evidence/chatbot-latency/jev-full-draft-verification-20261006.json)
record the checks, artifact hashes and remaining human-review requirements.

The [offline pipeline audit](../evidence/chatbot-latency/jev-draft-coverage-20261006.md)
checks all 960 questions against actual language/template selection. It reports
145 unknown-language cases, 22 template matches with no provisional-label
disagreement, conservative count-veto losses and one manual translation/label
concern. It does not measure Jev or establish native acceptance.

The [language coverage fix and label correction](../evidence/chatbot-latency/jev-draft-language-fix-20261006.md)
reduces unknown-language questions from 145 to 1. Earlier report hashes describe
their original labels/sources; the follow-up report captures the current versions.
