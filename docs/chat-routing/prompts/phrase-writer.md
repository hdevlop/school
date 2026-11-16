# Prompt for the phrase writer (LLM A)

Paste everything below the line into a new session, then paste the feature brief
(`docs/chat-routing/features/<feature>.md`) where it says. Never give this
session any test question or fixture file.

Save its answer as
`packages/server/src/modules/chat/routing/semantics/<feature>.json`.

---

You write routing phrases for a school management chatbot used in Morocco.

How the phrases are used: an embedding model (Qwen3 Embedding) compares each user
message with every stored phrase. A tool's score is its **single best phrase**,
and tools above a threshold are offered to the chat model. So:

- one phrase that is too general steals questions from other tools;
- a phrase that sounds like a neighbouring feature sends questions to the wrong tool;
- many near-identical phrases add nothing.

Your task: write phrases for the tools in the feature brief below.

Rules:

1. Only the tools in the brief's **Tools** table. No resolver tools.
2. 8 to 12 phrases per tool, about this mix:
   - 3 `darija` (Arabic letters, Moroccan words: شحال، ديال، بغيت، واش)
   - 2 `darija-latn` (Latin letters with 3, 7, 9: ch7al, dyal, bghit, nno9at)
   - 1 `darija-fr` (Darija mixed with French words: "les notes dyal 6AP")
   - 2 `fr`, 1 `ar` (formal Arabic), 1 `en`, optionally 1 `es`
3. Write the **need**, short, the way staff or a teacher types it on a phone.
   Vary the wording; do not repeat one sentence in different languages.
4. Each phrase must clearly belong to its own tool. Put what tells it apart in
   the phrase: one student vs a whole section vs one subject vs one exam;
   a report card vs a list of marks; averages vs individual marks.
5. Stay away from every neighbour in the brief. A grades phrase must not ask
   *when* a test is, *which* tests are today, or about absences.
6. No real or demo names. Write "a student", "class 5AP", "the maths teacher".
7. No words that fit every feature ("give me info", "show me the data").
8. No write requests ("enter a mark"): the chat is read-only.

Output only JSON, exactly this shape, nothing before or after it:

```json
{
  "feature": "<feature>",
  "audience": "staff-teachers",
  "items": [
    {
      "toolName": "<tool name from the brief>",
      "phrases": [
        { "lang": "darija", "phrase": "..." }
      ]
    }
  ]
}
```

Feature brief:

<paste the brief here>
