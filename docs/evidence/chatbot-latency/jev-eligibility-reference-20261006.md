# Offline Jev eligibility/readiness reference — 2026-10-06

The readiness reference already sealed the first selected path and started
fallback immediately when routing was ready. It now also checks eligibility
before invoking the classifier factory.

The server must supply mode `on`, a confirmed regex miss, detected reply
language `fr`/`ar`/`ary`, web channel, verified administrator status, complete
history and exactly zero prior user turns. Missing values, strings in place of
booleans/numbers, follow-ups, truncated history, unsupported languages/channels
and other modes skip classification. The corpus script label `ary-latn` is not
a detected renderer language; School detects supported Arabizi as `ary`.

A known synchronous regex match must be returned by the caller before readiness
preparation. The wrapper refuses such a call before starting either job. An
ineligible turn prepares normal routing without invoking the real classifier.
An eligible turn uses the existing race: routing ready at 50 ms selects the
model at 50 ms, cancels the classifier, and ignores its acceptance at 800 ms.
An already cancelled request starts neither job.

Focused checks pass **17 tests / 237 assertions**. All **346 script tests** and
lint pass; workspace boundaries cover 1,279 files and 289 client entries.
Tests use deterministic fake clocks/promises and cover eligibility,
cancellation, immediate/cached fallback, earlier accepted candidates, timeouts,
sync errors and losing promise rejections.
[Verification](jev-eligibility-reference-verification-20261006.json) records
checks and source hashes.

The code is an offline reference in `scripts/`, with no import from the School
application or published Najm packages. It neither authenticates these context
declarations nor executes tools; an eventual integration must derive them from
server state and use Najm's authenticated executor. It does not implement losing
attempt accounting, immutable diagnostics snapshots or the published async hook.
Those runtime requirements remain before enablement.

No provider, billing-ledger or live School-tool calls were made. Jev stays off;
B1/B2 runtime integration remains unstarted. The working native collection still
has zero questions/reviews. Actual native authorship, independent review and a
fresh accuracy pass remain prerequisites; this reference does not clear them.
