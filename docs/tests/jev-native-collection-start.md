# Start the human question collection

**Current workflow:** the owner has waived the requirement to write new questions
or obtain independent native labels. The assistant drafts; the owner checks the
Darija wording. Use the [100-question review](jev-operator-darija-review.md) and
reply “all OK” or send numbered corrections. No reviewer JSON or author records
are needed for that path. The [active protocol](jev-native-validation.md#active-owner-selected-workflow)
records the waiver and remaining classification/end-to-end checks. The human
collection instructions below are retained for optional future native evidence.

The current 100-question wording review is complete. The subsequent
[test results](../evidence/chatbot-latency/jev-operator-review100-results-20261007.md)
preserve 96 valid responses and four errors across all 100 authorized attempts.
No repeated wording confirmation is needed for that frozen version. The accuracy,
sample-size and latency checks remain open; its paid request allowance is consumed.

The [first-batch form](jev-native-first-batch.md) now contains 10 questions
explicitly attributed to an AI assistant. The operator confirmed the wording
with “done i verified is ok”. Its separate
[intake file](../../datasets/chatbot-latency/jev-native-first-batch.json) records
all ten as assistant-authored `dev` cases, with null labels and pending review.
The source date has no UTC time, so `authoredAt` remains null. This feedback
does not declare native fluency or independent blind intent/write labels.
The original wording is preserved; actual native-authored cases remain zero.

The [first-batch v3 worksheet](../../datasets/chatbot-latency/jev-native-first-batch-review-v3.json)
is ready for independent labeling of these development examples. Give a reviewer
only that worksheet and the [reviewer guide](jev-native-reviewer-guide.md).
Reviewing these questions retains their AI authorship and development split.

The [working collection](../../datasets/chatbot-latency/jev-native-collection.json)
now contains **960 assistant-written draft questions** in four language styles,
with provisional labels and pending review. Actual native-authored questions and
human reviews remain **zero**. See the [draft guide](jev-moroccan-draft.md);
the [full protocol](jev-native-validation.md) defines human acceptance.

For the first batch, provide 5–10 anonymized questions actually typed by you or
school users. Keep the original spelling, script and French/Darija mixing.
Remove private student names, IDs, contacts and financial details before sending
them. Do not copy the old tests or generate questions with an assistant.

Include the actual author/source, a stable pseudonymous author ID, collection
time if known, and whether that author declares native Darija fluency. Leave
unknown declarations unset. Questions originally written by an assistant retain
that source even if a human later reviews them.

The agent can record the supplied text and prepare a blind worksheet. A different
reviewer must label meaning before seeing Jev predictions or existing labels.
Their identity, actual review time and blind-review declaration come from that
review. If no independent reviewer is available, records stay pending.

This first batch starts collection; it cannot pass the gate. The complete test
collection needs at least 150 independently supported question families, 40
declared native-authored/reviewed Darija or Arabizi cases, 30 reviewed write
families per language style, and the required intent coverage. Linked variants
share a family and do not inflate independent counts. Classification must then
accept at least 150 independent families without a wrong acceptance.

Check the working file offline:

```powershell
bun scripts/chatbot-jev-native-intake.mjs --cases=datasets/chatbot-latency/jev-native-collection.json --check
```

Exit 1 is expected while records/reviews or coverage are incomplete. The probe
refuses raw intake and accepts only a validated held-out export. No provider
calls, human provenance, paid allowance or runtime enablement are supplied by
this starter file.

For the new first batch, the operator uses the
[case field guide](../../datasets/chatbot-latency/jev-native-intake.example.json)
to enter supplied text and actual declarations. Set the language/source from the
collected record rather than copying the example's defaults. Assign families and
splits before predictions; linked variants share a family. Leave labels and
review fields null/pending. Missing dates remain null and block held-out export
until resolved from actual records; never substitute today's date.

```powershell
bun scripts/chatbot-jev-native-intake.mjs --cases=datasets/chatbot-latency/jev-native-first-batch.json --check
# When exporting a changed collection, use a new output path; the first worksheet already exists:
bun scripts/chatbot-jev-native-intake.mjs --cases=datasets/chatbot-latency/jev-native-first-batch.json --worksheet=<new-review-worksheet.json>
```

Give the independent reviewer only that v3 worksheet and the
[reviewer guide](jev-native-reviewer-guide.md). An empty collection cannot produce
a review worksheet or held-out export. These commands stay offline.
