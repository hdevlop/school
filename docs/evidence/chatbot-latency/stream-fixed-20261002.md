# Fixes after the seeded run, 2026-10-02

Follows [the seeded run](stream-seeded-20261002.md): same workstation, demo data
(100 students), model (OpenRouter / `openai/gpt-oss-120b`), embeddings (Qwen via
Ollama), runner and corpus. Answer text was reviewed locally and removed from
the saved reports.

## Changes

School (uncommitted):
- **Date.** The system prompt computed `Today's date` once at module load, in
  UTC, so it went stale overnight and ignored the school's zone. The chat
  context now adds today's date and weekday per request on the school's clock
  (`SchoolChatContextProvider.describeToday`, using `schoolClock` and the
  settings time zone). The new test covers 23:30 UTC becoming the next day in
  Casablanca.
- **Language and style.** New prompt rules: reply in the language of the
  latest message (Modern Standard Arabic for Arabic; Darija only when the user
  writes it); answer greetings in two or three sentences about looking up data;
  do not offer changes as certain.
- **Name lookups.** The prompt and the routing dependencies of
  `attendance_mark`, `grades_create`, `grades_get_student_report` and
  `grades_get_by_student` now use `search_search_students` for a named student.
  The `students_get_students` description points to it. Routing preview stays
  at 14/20 ([report](routing-qwen-search-20261002.json)), and the search tool
  is selected alongside every write/report tool.
- **Blocked-action message.** `assistant.security.readOnlyMode` (four
  languages) said writes "will be available after confirmation approval is
  added". The adapter appends the tool's own confirm question
  ("Créer cette note ?"), and the model asked the user "Confirmez-vous ?".
  The message now says nothing was done, confirming in chat changes nothing,
  and the change belongs in the dashboard.

Najm `najm-chatbot` (in `C:\Users\pc\Desktop\najm`; uncommitted, unpublished):
- `streamTimeout` config passed to `streamText`, defaulting to
  `{ chunkMs: 60_000 }`. A test with a provider that goes silent mid-answer ends
  in about 200 ms with an `abort` event, keeping the partial text.
- Token usage: `computeUsageCost` read v4 `promptTokens`/`completionTokens`;
  AI SDK v6 sends `inputTokens`/`outputTokens`, so the finish event never
  carried usage. New `normalizeUsage` reads both. A stream test checks tokens
  and cost for `openrouter:openai/gpt-oss-120b`.
- The built-in read-only fallback message matches School's new wording.
- 172/173 package tests pass. The failing `ai-settings > GET returns hasKey
  boolean` test fails identically without these changes. The build passes,
  and the public API snapshot is updated for the three additive exports.

School does not receive the Najm fixes until a published `najm-chatbot` is
pinned; the runs below still use 2.0.3, so they carry no usage and no stall
limit.

## Blocking with a real student

A two-case fixture used the demo student "Alia Moutawakil" (local seed only;
kept outside the repository). Before and after every run: her 12 attendance
rows and 4 grades, and the table totals (2,326 attendance, 64 grades), were
unchanged.
- First run ([report](stream-blocking-real-student-20261002.json)):
  `search_search_students` → `attendance_mark` refused; the answer sent the
  user to the dashboard. `search_search_students` → `assessments_get_all` →
  `grades_create` refused; the French answer then asked "Confirmez-vous ?".
- After the message change ([report](stream-blocking-real-student-rerun-20261002.json)):
  attendance was refused, with the dashboard pointer and no confirmation
  question. The French grade request asked which test "le dernier contrôle"
  meant before calling `grades_create`, a fair clarification.

## 36-request comparison ([report](stream-fixed-20261002.json))

36/36 completed (before: 35/36, one stalled stream). Two automatic "failures"
were blocked-write cases where the model called `attendance_mark` /
`grades_create` for the synthetic name; both were refused and nothing was
written, so they are blocked attempts, not writes.

| Group | Before: first text p50 / complete p50 | After |
|---|---|---|
| All | 2.4 s / 4.8 s (n=35) | 3.1 s / 4.5 s (n=36) |
| Small talk | 1.2 s / 4.9 s | 1.9 s / 3.7 s |
| Single read | 2.8 s / 3.9 s | 3.5 s / 4.4 s |
| Write request | 10.2 s / 12.5 s | 6.3 s / 6.7 s |

Complete p95: 16.6 s before, 15.7 s after. With n=6–18 per group and no cache
control, small shifts are noise. The clear changes:
- Write requests are about twice as fast, because they use search instead of
  the full student list.
- Greetings are short: 228–480 characters, against 426–2,001 before.

Review: counts 12/12 correct; attendance answers 6/6 correct, and the dates
they gave were right ("Friday 2026-10-02"). French grade requests were
answered in French 3/3 (before: English 3/3).

This run exposed a regression from the first language rule: standard-Arabic
greetings were answered in Darija. The rule was narrowed (Darija only when the
user writes it), and greetings were told not to offer changes. A 10-request
recheck ([report](stream-language-recheck-20261002.json)) passed: all
Arabic answers were in Modern Standard Arabic, greetings were 219–362
characters about looking up data, and greetings completed in 1.5–5.2 s.

## After `najm-chatbot@2.0.4` ([report](stream-najm-chatbot-204-20261002.json))

The owner published 2.0.4 (Najm commits `29faf2b`, `2647a14`). Before
pinning, the npm tarball was checked: it contains `normalizeUsage`, the 60 s
default (`chunkMs: 6e4`) and the new read-only message. The lockfile integrity
matches the registry. School pins 2.0.4 in all three manifests and sets
`streamTimeout: { chunkMs: 30_000 }`. Lint, full typecheck, the boundary/pin
tests (33) and chat tests (13) pass.

One pass of the 12 cases: 12/12 completed and passed review. First text p50
was 2.2 s and complete p50 2.4 s (max 10.3 s, the first greeting after
restart). **All 12 reported usage:** 21,719 input and 2,037 output tokens,
an estimated $0.0012 in total (about $0.0001 per answer, gpt-oss-120b at
$0.039 / $0.19 per million). Greetings used about 1,045 input tokens; tool
answers used 2,100–2,350. That is an estimate from Najm's pricing table;
OpenRouter's billing is authoritative.

The stall limit cannot be triggered against a live provider on demand. It is
covered by the Najm test, in which a silent stream ends after 200 ms with an
`abort` event.

## Still open

- Routing remains 14/20 (French/Arabic grade reports, Spanish grade entry,
  Darija, mixed language, topic switch).
- Sample sizes are smoke level; the section 6 corpus and repetitions remain.
