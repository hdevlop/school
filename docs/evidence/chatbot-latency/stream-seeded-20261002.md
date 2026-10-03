# Streaming run on seeded data, 2026-10-02

Raw report: [stream-seeded-20261002.json](stream-seeded-20261002.json) (answer
text removed after review). Same runner, corpus, workstation, model
(OpenRouter / `openai/gpt-oss-120b`) and embeddings (Qwen via Ollama) as the
[empty-database smoke run](stream-smoke-20261002.md). Budget 36 requests:
12 cases × 3 repetitions in order, sequential, admin, year 2026-2027.

## Data

`bun run seed:demo` added the standard demo school. It first refused because
the 2026-2027 calendar had `assumed` provenance. The admin
`POST /api/academic-years/arA1O/verify-calendar` marked it verified, with a
note saying it is a synthetic local demo calendar, and the seed then completed
all 29 phases. Relevant facts, checked through REST and PostgreSQL before the
run: `/api/students/count` = **100**; no student attendance is dated
2026-10-02 (the latest is 2026-09-29, 58 rows).

## Results

35 of 36 completed; 1 timed out. All 35 passed the automatic checks, but
human review found the failures listed below.

| Group | n | First text p50 / p95 | Complete p50 / p95 |
|---|---:|---|---|
| All completed | 35 | 2.4 s / 12.5 s | 4.8 s / 16.6 s |
| Small talk | 11 | 1.2 s / 11.2 s | 4.9 s / 16.6 s |
| Single read | 18 | 2.8 s / 8.9 s | 3.9 s / 12.1 s |
| Write request | 6 | 10.2 s / 27.2 s | 12.5 s / 31.4 s |

p95 over 6–18 observations is close to the maximum; treat it as such. The
first repetition was slower than the next two for most reads (count first text
4.1–5.6 s, then 1.4–5.9 s). Caches, provider routing and model load were not
controlled, so the cause is not established.

## Review

**Correct:**
- Count, 12/12: each called `students_get_student_count` once and answered
  100, in the question's language, in two LLM steps.
- Today's attendance, 5/6: each called `attendance_get_today_students` and said
  there are no records today, which matches the data.

**Failures the automatic checks missed:**
1. **Stalled stream (1/36).** `greeting-en#2` streamed 223 text deltas
   (1,147 characters, first text at 1.3 s), then nothing: no error, no
   `finish`, no `[DONE]`, until the runner aborted at 120 s. Neither the app
   nor the widget ends a provider stream that goes silent, so a user would see
   a frozen partial answer. A stall timeout belongs in `najm-chatbot`.
2. **Wrong language (3/3).** Every French grade-entry request
   (`grade-create-blocked-fr`) was answered in English.
3. **Wrong date (1/6).** `attendance-today-fr#3` gave today's date as
   "10 octobre 2026"; the data and School's time zone give 2 October.

**Not tested:** the write requests again called `students_get_students` (and
once `assessments_get_all`), did not find the synthetic student, and never
reached `attendance_mark` or `grades_create`. Blocking remains unproven.

**Slow path:** write requests took the longest (complete p50 12.5 s, max
31.4 s). They looked up a name by calling `students_get_students`, which
returns the whole year's list rather than a search, so a large tool result goes
back to the model. Arguments and tool-result sizes were not recorded, so this
is a hypothesis for Phase 3, not a measurement.

**Greetings:** 426–2,001 characters, listing capabilities including writes the
adapter blocks. Long answers explain most of their completion time.

**Usage:** the stream again carried no token usage, so cost is unknown.

## What this run does not establish

A p95 with a meaningful sample size, cost, cache-controlled conditions,
non-admin roles, blocked-write behavior, browser rendering, or production.
