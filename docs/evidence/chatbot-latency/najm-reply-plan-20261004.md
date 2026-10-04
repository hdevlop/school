# Shared Moroccan reply policy validation

Najm owns opt-in latest-message language instructions and safe template execution.
School owns count intents, localized refusal text, exam limits and multi-count
policy. Default GPT-OSS remains selected; no AI-setting or school-domain writes
are part of this validation. Existing Cerebras routing configuration is preserved.

Najm `48098814101ea070732c03739f434f22a00e0e5b` packages `najm-chatbot@3.3.0`.
The exact published tarball SHA-256 is
`91b1fbbf8a1a2799f4b43c041c25c98f2c538fa85cb70dcd92eee3c6085e6555`.
Registry availability/integrity must be verified before installing. No local
framework link, source copy or local tarball dependency is allowed in School.

School validation uses `%TEMP%/school-najm-replies-20261004`, a full frozen copy
of tracked worktree files plus required untracked source/tests/corpus. Published
dependencies are independently installed. Node Next will listen at 3171 with
its own output, benchmark controls enabled and the existing private environment.
The previously shared development app was not running at the initial preflight;
that failed readiness check sent no model request.

Before paid requests, run focused template/language/year tests, benchmark CLI
tests, lint, typecheck and a production build. Capture fresh internal MCP/REST
school facts and compare them to the existing corpus. Use all 30 original cases,
serially, fresh application caches, retained text and correlated diagnostics.

Maximum initial requests: 30; client-estimate ceiling: $0.50; per-request reserve:
$0.01; no paid warmups. Templates make no LLM call; diagnostics identify them and
report zero model tokens/cost. They still perform routing/knowledge work and,
for counts, actual guarded MCP reads. Treat this as a hybrid-path benchmark;
do not attribute template times to GPT-OSS generation. Token estimates are not
provider invoices or hard billing caps.

The runner holds a machine-wide cooperative lock across School checkouts and
verifies provider/model settings before each chat. Do not run an older benchmark
that lacks this lock. Verify GPT-OSS before and after. Review every failed reply;
retain raw failures, fix the cause, rerun all 30 after any product change, and
require 30/30 before considering another speed comparison. Any extra run gets
its own recorded request/budget ceiling before execution.
