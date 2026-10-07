# Jev native-language acceptance collection

## Active owner-selected workflow

The owner explicitly changed the collection requirement: “i dont have to write
so bypass , u can write and i will review if exactly like my darija”. Use the
[assistant draft wording review](jev-operator-darija-review.md) for current work.
The assistant writes questions and provisional intent/write labels; the owner
confirms the wording or sends corrections. No manual JSON, reviewer IDs, timestamps,
native-authorship declarations or independent human label reviews are required
for this alternative. The assistant records actual feedback and binds approval
to the exact corpus; it does not invent feedback or claim native authorship.

The [new corpus](../../datasets/chatbot-latency/jev-operator-darija-review.json)
uses `fresh-exploratory`, `reviewWorkflow: assistant-draft-operator-review`,
an explicit authorship waiver, and `operatorLanguageReview`. The owner completed
edits/additions with “done”; wording review is recorded for the exact 100-case
batch. The [frozen copy](../../datasets/chatbot-latency/jev-operator-review100-frozen-20261007.json)
has the same cases and review hash. The earlier ten-question verification was
not used as approval for this batch. For later batches, reply “all OK” or send
numbered corrections; the agent records actual feedback and the current hash.
An edited case invalidates approval. Pending batches permit offline validation
and block ordinary paid dispatch. An explicitly requested assistant-development
benchmark may use `--unreviewed-development` with a concrete bounded allowance:
it keeps wording review pending, records development mode, cannot pass
qualification, and cannot be used for native exports or human-origin corpora.
No new paid allowance is granted by the workflow flag itself.

The [classification plan](../evidence/chatbot-latency/jev-operator-review100-plan-20261007.json)
was subsequently authorized with “do it”; the original proposal stays preserved.
The [completed study](../evidence/chatbot-latency/jev-operator-review100-results-20261007.md)
used all 100 slots with no retries, two-second pacing and the $0.02 client stop.
There are 96 valid responses and four preserved transport errors. Eligible
acceptance is 38 cases / 31 paired families with zero accepted label disagreements,
while mean/p95 is 433.6/663.1 ms and the classification gate stays failed. Known
cost is $0.003770844 plus $0.0006 retained unknown-cost reservations. No new calls
are authorized by unused dollars. Nine queries have unknown detected language;
they stay reported rather than being counted as eligible runtime replies.

The subsequent [fixes and regression recheck](../evidence/chatbot-latency/jev-fixes-report-20261007.md)
recognizes those nine variants and refuses all 18 writes before classification.
It explicitly uses `purpose: regression-recheck`, with the exact approved cases
and reference hashes, rather than pretending the old questions are fresh. Its
separate 100-slot/$0.02 allowance is also consumed. The new optional semantic
veto source is frozen during continuations; the live recheck remains insufficient
for the fresh accepted-family gate, and p95 is still above the target.

The [new 304-case stress review](jev-fresh-stress304-review.md) is now prepared
with assistant labels, pending wording feedback, canonical freshness checks and
an offline audit. It has 61 conservatively linked semantic groups and cannot
meet the 150-family gate. The [network and preparation report](../evidence/chatbot-latency/jev-transport-and-next-batch-20261007.md)
includes a concrete 304-request/$0.05 optional proposal, not an authorization.
The old 100-case wording approval and consumed request allowances do not transfer.

This replaces the native-authorship/native-review prerequisite for the current
synthetic evaluation path. The original native protocol below remains available
for future native evidence and its strict exporter is unchanged. Native counts
remain zero; operator wording feedback does not independently verify assistant
labels or establish a native precision bound. Historical failures stay recorded.

The classifier still needs zero accepted wrong labels, no write accepted as a
read, at least 150 accepted unique cases and 150 declared question families, and
warm p95 at most 500 ms. Paired variants count once by family. Generated family
IDs do not prove independent real-user sampling. The 100-question/50-family review
batch establishes wording preferences and cannot clear that numerical gate alone.
Framework publication, readiness-race, tool authorization and end-to-end gates
remain before runtime enablement. Results use `operator-reviewed-synthetic`;
`productionAcceptance` stays false for the classification report.

```powershell
bun scripts/chatbot-jev-probe.mjs --cases=datasets/chatbot-latency/jev-operator-darija-review.json --acceptance-policy=core --validate
```

## Original native-evidence protocol

This is the collection protocol for a future accuracy study. It contains no
native-authored or reviewed cases and grants no new paid request allowance.
The completed assistant-authored core exploration failed accuracy. See
[work order B0](../../CHATBOT-LATENCY-PLAN.md#94-work-order).

## Collect and label before testing

1. Use anonymized questions actually typed by school users, or ask native
   speakers to write new questions without seeing Jev's predictions or the old
   test wording. Keep the original spelling, punctuation and code-switching.
2. Keep native authorship and native review separate. Reviewing an assistant's
   sentence does not make it native-authored. Retain the actual source for each
   case and do not silently replace it during export.
3. Give each independent question family a stable ID. Translations and linked
   paraphrases share that ID and stay in the same dev/test split. Do not assign
   new IDs to repeated or translated questions to increase the sample count.
4. Have an independent reviewer label the intended operation before running
   Jev. A reviewer should not see the model's choice, probabilities or confidence.
   Resolve disputed labels before freezing the held-out set; unresolved cases
   are not scored as correct by default.
5. Check IDs and canonicalized text against the base, original Jev and core
   exploration corpora. Spelling changes or translations of known families do
   not count as fresh independent families. Only dev questions may tune wording
   or thresholds. Freeze test text, labels, policy and sources before dispatch.

## Coverage to collect

Collect enough independently written supported requests to obtain at least
150 unique accepted test questions from independent families. Accepted counts
cannot be guaranteed before testing; repeated runs do not increase that count.
Include French, Arabic, Darija in Arabic script and Arabizi, with at least 40
native-authored Darija/Arabizi questions and actual human review.

Include unfiltered school-wide counts, combined student/teacher counts, class
lists, today's school-wide attendance and small talk. Also collect at least 30
write commands per style, mixed French/Darija, qualified or calculated counts,
exam counts, past-year requests, named lookups, how-to questions, ambiguity and
follow-up fragments. Keep the original nine ground-truth intents. Under `core`,
`upcoming_exams` remains a ground-truth label but is not eligible for a Jev reply.

## Per-case collection record

| Field | Meaning |
|---|---|
| `id` | Unique case ID, never reused from a spent corpus |
| `query` | Anonymized original utterance; preserve its language and spelling |
| `language` | Human label: `fr`, `ar`, `ary` or `ary-latn`; actual language gating is evaluated separately |
| `familyId` | Shared by linked translations/paraphrases; reflects the real collection relationship |
| `split` | `dev` or `test`, assigned by family before any prediction |
| `intent` / `isWrite` | Reviewed nine-intent ground truth and matching write label |
| `source` | `real_user`, `native_author` or `assistant`; assistant-origin test records block export even after human review |
| `authorId` / `authoredAt` | Pseudonymous source and actual collection time; required for reviewed held-out records |
| `authorNativeDarijaSpeaker` | True only when the actual author declares native Darija fluency; null means unknown |
| `reviewerId` / `reviewedAt` | Actual independent review record; leave absent until reviewed |
| `reviewStatus` | Pending, agreed or disputed; resolve disputes before freezing |
| `reviewBlind` | True only after the reviewer declares that existing labels/model predictions were hidden during their review |
| `reviewQuestionSha256` | Worksheet-generated fingerprint binding the review to the exact question and collection context |
| `anonymization` | `{ confirmed, notes }`; record substitutions without retaining private originals |

Use UTC timestamps such as `2026-10-05T09:00:00Z` and stable pseudonymous IDs
using letters, digits, dots, underscores or hyphens. Review must follow actual
collection time. Leave review fields null/pending until the review happens.

## Offline intake and blind review

Copy the [empty template](../../datasets/chatbot-latency/jev-native-intake.example.json)
to a new collection file. Add actual questions to `cases` using `caseTemplate`
as a field guide. The template itself never counts as a collected question.
No human questions or reviews have been supplied with this implementation.
The [working collection](../../datasets/chatbot-latency/jev-native-collection.json)
contains an explicitly assistant-authored, dev-only [960-question draft](jev-moroccan-draft.md).
It has no actual native authorship or human review. Collect new human questions
with their real provenance; reviewing the AI draft does not make it human-authored.

```sh
bun scripts/chatbot-jev-native-intake.mjs --cases=<collection.json> --check
bun scripts/chatbot-jev-native-intake.mjs --cases=<collection.json> \
  --worksheet=<new-review-worksheet.json>
# After the reviewer completes the worksheet:
bun scripts/chatbot-jev-native-intake.mjs --cases=<collection.json> \
  --import-review=<completed-review-worksheet.json> --output=<new-reviewed-intake.json>
bun scripts/chatbot-jev-native-intake.mjs --cases=<new-reviewed-intake.json> --check
```

`--check` prints collection counts and blockers, without logging question text.
It exits 1 while the collection is incomplete. A worksheet requires collected,
confirmed-anonymized questions and omits original labels, prior reviews and
model outputs. The reviewer fills `intent`, `isWrite`, their identity/time,
`reviewStatus` and `reviewBlind`. Import the completed worksheet against the
original collection with `--import-review`; all these commands stay offline and
require no provider key. Review identities, times and declarations must come
from the actual review, rather than being filled automatically.

Version 3 worksheets bind each review to the exact text, ID, language, family,
split, source, author record and anonymization record. Labels, review fields and
model outputs are excluded from the fingerprint. Changing the question or its
collection context invalidates an earlier review. The reviewer sees opaque
question/family IDs in hash-sorted order, with original IDs, author metadata and
split omitted. Version 2 exposed original IDs that could encode labels. Re-export
legacy versions 1/2 to a new v3 worksheet and complete an independent review
before import; preserve earlier files as history.

Give the reviewer only the v3 worksheet and the label definitions. Keep the
original intake and prediction reports with the collection operator. The importer
derives the opaque mapping from that intake and restores reviews under original
IDs/families while retaining actual authorship and provenance.
The [reviewer guide](jev-native-reviewer-guide.md) supplies the nine category
definitions and actual-review field instructions without case labels/predictions.

The importer rejects stale or edited worksheet context, missing/duplicate IDs,
unexpected fields and conflicting replacements of completed reviews. Pending
rows preserve their original records. Import creates a new intake file with
input/worksheet hashes and refuses to overwrite existing files. Fingerprints
detect accidental edits; they do not authenticate authors, reviewers or labels.

The validator rejects duplicate canonical text, family leakage across dev/test,
conflicting reviewed family labels and invalid timestamps. Held-out records
must be fresh against base, original Jev, core,
[count-guard development](../../datasets/chatbot-latency/jev-count-guard-dev.json)
and [Moroccan AI development](../../datasets/chatbot-latency/jev-moroccan-development.json)
corpora; old cases may be used in dev for regression work. Family relationships, actual authorship,
identity and review independence still require human audit. The tool checks
recorded declarations rather than authenticating people or verifying nativity.

## Export the reviewed held-out set

```sh
bun scripts/chatbot-jev-native-intake.mjs --cases=<new-reviewed-intake.json> \
  --export=<new-native-heldout.json>
bun scripts/chatbot-jev-probe.mjs --cases=<new-native-heldout.json> \
  --acceptance-policy=core --validate
```

Export requires every held-out record to have agreed, blind review by a different
recorded person, an author/time record and confirmed anonymization. It also
requires at least 150 reviewed supported families, 40 declared native-authored
and reviewed Darija/Arabizi cases, 30 reviewed write families per style and
coverage of each supported intent plus `needs_llm`. These are collection
minimums; they do not guarantee 150 *accepted* families after classification.

Only held-out cases are exported. Export retains their source/review records and
hashes the cases, intake and all five currently registered prior corpora. Existing output files are never
overwritten. The probe validates the export and current previous-corpus hashes
before any network call. Raw intake, review worksheets, unknown corpus purposes,
changed exports and incomplete collections are refused. A future study must
also register any newly spent native corpus in the freshness checks.

`fresh-exploratory` retains its separate assistant-only validator; never relabel
human intake to bypass collection checks. Native reports distinguish a numerical
`classificationGatePassed` from `productionAcceptance`, which remains false.
An exported collection does not establish actual authorship, label correctness,
model performance or production readiness. All commands above are offline.

## Freeze, evaluate and report

Save corpus/source hashes, human review records and the fixed model request,
acceptance scope, confidence threshold and write guard. Declare that study's
request cap, client budget, per-attempt reservation and pacing before paid calls.
Use a fresh report; retain unknown costs and failures. A changed held-out set is
a new experiment, not a continuation of the synthetic study.

Report precision and coverage by language and intent, accepted wrong questions,
writes accepted as reads, family counts, abstentions, errors and successful warm
classification latency. Preserve false acceptances even if they guide later dev
changes. Require zero accepted wrong among at least 150 independent accepted
test questions, no write accepted as a read and warm p95 at most 500 ms. Report
any uncertainty introduced by clustered sources or linked translations.

Accuracy acceptance still does not measure complete School replies. The
published async hook, readiness race, tool authorization, end-to-end latency and
data-handling gates in B1–B4 remain before runtime enablement.
