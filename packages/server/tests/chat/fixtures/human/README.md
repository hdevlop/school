# Human-written chat test questions

Every other file in `fixtures/` was written by an AI assistant, the same one that wrote the
chat's routing phrases. Those tests are too easy: the questions and the phrases come
from the same head. This folder is for questions **written by a person**, the way real
parents, students and staff will type them. They are the fair test of the chat.

## Before you start: do not look

Do **not** open these before you write. If you already did, say so in the file
(`"sawRoutingFiles": true`); the questions are still useful, just less independent.

- `packages/server/src/modules/chat/routing/` (phrases, Darija words, hints)
- the other files in `fixtures/`

You **may** open the dashboard to see real demo names, classes and numbers.

## The file

One JSON file per writer and session: `fixtures/human/<your-initials>-<YYYY-MM-DD>.json`.
`example.json` shows the shape only; do not reuse its wording.

```json
{
  "author": "HK",
  "writtenOn": "2026-11-16",
  "sawRoutingFiles": false,
  "cases": [
    { "id": "hk-001", "as": "parent", "lang": "ary", "q": "...", "want": "..." }
  ]
}
```

| Field | Required | What to put |
| --- | --- | --- |
| `id` | yes | Your initials + a number: `hk-001`, `hk-002`, … Never reuse one. |
| `as` | yes | Who asks: `admin`, `principal`, `accounting`, `secretary`, `teacher`, `parent`, `student`. |
| `lang` | yes | `ary` Darija in Arabic letters · `ary-latn` Darija in Latin letters (3, 7, 9…) · `ary-fr` Darija mixed with French · `ar` formal Arabic · `fr` · `en` · `es`. |
| `q` | yes | The question, exactly as the user types it. |
| `want` | yes | In plain words, what a correct answer gives. "Homework of my daughter Maha for this week." For small talk: `"small talk"`. For a refused request: `"refuse"`. |
| `answer` | no | A fact you checked in the dashboard that the reply must contain: `"465 students"`, `"class 1AC B"`. Leave it out if you did not check. |
| `tools` | no | Tool names you know are right (any one of them counts). Leave it out if you are not sure; tools are labelled after you finish, from your `want`. |
| `note` | no | Anything odd: "two questions in one", "typo on purpose", "name does not exist". |

## How to write the questions

1. **Write like a phone user, not a teacher.** Short, no punctuation, typos, French words in
   Darija, `wach`, `ch7al`, `3afak`. Do not correct yourself. Real messages look like
   `ch7al ba9i khasni nkhless l weldi` or `les notes dyal bnti f lmath`.
2. **Write each language yourself, never translate.** A French parent and a Darija parent
   ask differently. If one idea appears in two languages, word each one naturally.
3. **One need per question.** Add a few with two needs on purpose and mark them in `note`.
4. **Say "my" the real way.** Parents write `ولدي`, `بنتي`, `ولادي`, `mon fils`, `ma fille`,
   or just a first name (`Maha`). Staff write full names (`ABID MOHAMMED AMINE`).
5. **Use demo names you can see in the dashboard**, so the answer can be checked. Add a few
   names that do not exist (mark them in `note`).
6. **Only demo data.** No real person's name, phone number or address. Never paste a
   password or API key.

## What to cover

Aim for **120 to 200 questions**. Spread them across these rows; a few per row is enough.

| Topic | Examples of the need |
| --- | --- |
| Grades | a child's marks, one subject, a test result, a class average |
| Absences | how many times absent, late, absent today, this month |
| Homework | what homework, for tomorrow, for one subject |
| Fees | how much is left to pay, what was paid, one month, all children |
| Exams | next exams, today's tests, one child's exams |
| Class | which class or section, who teaches |
| Timetable | when is maths, today's lessons (the chat cannot answer yet: test that it says so) |
| Events and news | upcoming activities, trips, latest announcements |
| Alerts | new alerts, notifications about my child |
| Transport | which bus, the driver |
| Counts | how many students, teachers, classes |
| Contacts | a parent's phone number (staff only) |

And these special kinds, about one in ten each:

- **Small talk:** hello, thanks, who are you, what can you do.
- **Write requests** (`want: "refuse"`): add a student, mark absent, send a message, change a mark.
  The chat is read-only and must refuse.
- **Privacy:** a parent asking about a child who is not theirs (`want: "refuse, not my child"`).
- **Another school year:** "last year's marks". The chat must ask the user to pick the year
  in the dashboard.
- **Out of scope:** weather, football, homework help ("solve this equation").

Mix the askers too: about half parents, the rest staff, teachers and students.

## Working one feature at a time

You can write one feature, have it tested and fixed, then move to the next. Then:

- Name the file after the feature: `fixtures/human/<initials>-<feature>-<YYYY-MM-DD>.json`,
  for example `hk-fees-2026-11-16.json`, and add `"feature": "fees"` at the top.
- Write **30 to 40 questions** for that feature: every language, every role that can ask it,
  and the special kinds above that fit (a write request, another family's child, last year).
- Add **5 to 10 look-alikes**: questions that sound like this feature but are another one
  (`want` says what they really ask). For fees: `الواجبات` can be homework,
  `خلص`/`kemmel` can mean "finished". These catch most routing mistakes.
- After each feature's fix, all earlier questions are run again, so one fix cannot quietly
  break another feature.

A good order, by how often parents ask: grades, absences, homework, fees, exams,
class and timetable, events and news, alerts, transport; then staff questions (counts,
one student's record, contacts).

## What happens next

The questions are run through the chat's routing (free, local), then a smaller set through
the real chat model (paid, a fraction of a cent per question). No routing phrase is ever
written from these questions; a check stops any phrase that copies one.
