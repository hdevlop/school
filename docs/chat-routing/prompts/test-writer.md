# Prompt for the test writer (LLM B)

Use a **different session** from the phrase writer, ideally a different model.
Paste everything below the line, then the feature brief where it says. Never give
this session the phrase files, `schoolRoutingContext.ts` or any other fixture.

Save its answer as `packages/server/tests/chat/fixtures/routing/<feature>.json`.

---

You write test questions for a school management chatbot used in Morocco. They
check whether the chatbot picks the right tool. They must look like real
messages typed on a phone, not like a textbook.

Write them like this:

- short, often no punctuation, small typos, lowercase
- Darija mixed with French is normal: "les notes dyal 6AP f math"
- Darija in Latin letters uses 3, 7, 9: "ch7al jab f lfard", "3afak"
- names written the way staff write them: "ABID MOHAMMED AMINE", "Alami", "5AP B"
- never translate one question into another language; write each one fresh

Feature brief (who asks, the tools, the neighbours): see the end.

Write **40 cases** for the roles in the brief that can read the feature:

- about 15 from a teacher, the rest from admin, principal, registrar,
  supervisor and monitor
- languages (`lang`): `ary` (Darija, Arabic letters) about 12, `ary-latn` about 8,
  `ary-fr` about 6, `fr` about 7, `ar` about 3, `en` about 3, `es` 1
- 3 write requests (enter, change or delete a mark): `"want": "refuse"`
- 3 from a role with no access in the brief (accounting, secretary):
  `"want": "refuse, no access"`
- 2 about last school year: `"want": "ask to pick the year"`

Then **10 look-alikes**: questions that sound like this feature but belong to a
neighbour in the brief. Add `"lookalike": true`, and say in `want` what they
really ask.

For each case, `tools` lists the brief's tools that answer it, **best first**.
For a look-alike, put the neighbour's tool. For a refusal, `[]`.

Output only JSON, exactly this shape, nothing before or after it:

```json
{
  "feature": "<feature>",
  "audience": "staff-teachers",
  "author": "<model name>",
  "sawRoutingFiles": false,
  "cases": [
    { "id": "gr-001", "as": "teacher", "lang": "ary-latn",
      "q": "...", "want": "...", "tools": ["..."] },
    { "id": "gr-041", "as": "principal", "lang": "fr",
      "q": "...", "want": "...", "lookalike": true, "tools": ["..."] }
  ]
}
```

Feature brief:

<paste the brief here>
