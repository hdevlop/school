# First streaming smoke run, 2026-10-02

Raw report: [stream-smoke-20261002.json](stream-smoke-20261002.json) (answer
text removed after review). Runner: `scripts/chatbot-benchmark.mjs`, budget
12 requests, sequential, admin account, academic year 2026-2027.

## Setup

- Second workstation (`C:\Users\pc`), dev server on :3102 (`next dev`, not a
  production build), git `b96c55f` with an uncommitted working tree.
- Chat: OpenRouter / `openai/gpt-oss-120b`. The key was saved to AI Settings
  through the admin `PUT /api/ai-settings` from a local environment variable;
  `hasKey:true` was verified and the other settings were unchanged.
- Embeddings: Qwen3 Embedding 0.6B Q8_0 via Ollama, 430 tools indexed, routing
  preview 14/20 ([re-run](routing-trial.md#re-run-on-the-second-workstation-2026-10-02)).
- **Database: empty.** 0 students, enrollments, attendance and grade rows,
  confirmed by REST (`/api/students/count` = 0) and PostgreSQL. Read tools
  returned empty results, so tool and answer time are lower than with data.
- Caches and model load state were not controlled. One request per case.

## Results

All 12 requests completed (HTTP 200, `finish`, `[DONE]`); none errored or timed
out.

| Group | n | First text p50 / max | Complete p50 / max |
|---|---:|---|---|
| All | 12 | 5.1 s / 12.3 s | 8.5 s / 20.3 s |
| Small talk | 4 | 1.6 s / 4.8 s | 8.8 s / 20.3 s |
| Single read | 6 | 5.4 s / 12.3 s | 7.7 s / 13.0 s |
| Write request | 2 | 5.8 s / 12.3 s | 6.7 s / 17.3 s |

With n=12 these are smoke values, not p95 estimates; "max" is reported instead.

## Review

- **Correctness.** Each count answer (four languages) called
  `students_get_student_count` and reported 0, which matches the database.
  Both attendance answers called `attendance_get_today_students` and said no
  records exist. Every answer was in the question's language.
- **Steps.** Every read used two LLM steps (tool call, then answer), within the
  section 8 proposal of at most two for fully specified single reads.
- **Greetings are slow to finish, not to start.** First text arrived in
  1.3–4.8 s, but the answers were 1,100–2,200 characters long, listing
  capabilities, so completion took 8.5–20.3 s. They also offer to create,
  update and delete records, which the adapter blocks for confirmation-marked
  tools. This is a quality issue and a candidate for a system-prompt change in
  Phase 2 or 3.
- **Blocking was not exercised.** Both write requests called
  `students_get_students`, found no `Zzbench Qqtest`, and asked the user to
  check the name. Neither reached `attendance_mark` or `grades_create`, so
  these passes say nothing about whether confirmation-marked tools are blocked.
  No attendance or grade rows exist after the run.
- **No usage data.** The stream carried no message metadata, so tokens and
  cost are unknown for every request (section 2.3). Provider-side records are
  the only source until Phase 1.
- No chat session rows were written (`chat_sessions` stayed at 0).

## What this run does not establish

A baseline on representative data, cost, provider or app cache effects,
non-admin roles, blocked-write behavior, browser rendering, or production.
