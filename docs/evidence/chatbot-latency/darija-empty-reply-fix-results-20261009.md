# Empty chat reply safeguard — 2026-10-09

The silent empty-reply defect is repaired on School's existing HTTP chat path.
If the published provider/SDK stream finishes without visible answer text,
School inserts a short failure message in the request's language before the
finish event. A Darija request gets:

> ما قدرتش نكمل الجواب دابا. عاود سولني، أو شوف المعطيات فلوحة التحكم.

The finish metadata carries `schoolReplyOutcome: "unavailable"`. This is a
failed answer with a visible notice, not a correct school-data answer. Provider
errors retain error semantics and receive a public localized message; truncated
or thrown streams cannot silently appear to finish successfully. Partial
answers followed by errors get the same failure notice.

Successful answer frames, tool inputs/results and reported usage pass through.
Missing usage stays unknown. The safeguard makes no model retry or tool call,
changes no permissions or year selection, and does not infer an access denial
or empty school records from a provider failure. User cancellation remains a
stop without an added failure message. It streams complete events as they arrive
and bounds its pending frame buffer; large tool results pass through.

This is a School middleware change using the existing published ChatController,
ChatAgent and SDK. Najm source, pins, auth, routing and saved AI settings were
not changed. Failure notices are transport output, not persisted model answers;
the framework continues to own stored conversation history.

## Verification

| Check | Result |
|---|---|
| Previously failed teacher outsider scenario, live 20B/CoreWeave | 3/3 visible replies; zero protected-data leaks |
| Mean live full reply | 1.644 seconds; no two-second cutoff |
| Direct outsider academic read | Denied for the authenticated teacher |
| Controlled empty completion through actual School HTTP | Visible Darija unavailable notice; zero external generation calls |
| Focused stream tests | 11 passed |
| Chat and year regression checks | 503 passed |
| Root lint, typecheck, production build | Passed |
| Workspace boundaries | Passed: 1,331 files |

The existing teacher had 44 assigned students. Live checks reused the earlier
failed Darija scenario against an existing student outside that assignment.
They did not reproduce the intermittent empty response, so those three replies
alone do not establish that the repair branch ran. The controlled fault used
the actual authenticated local School endpoint and published ChatAgent/SDK
with a scripted empty model; it exercised that branch without paid inference.
Its SDK usage metadata is synthetic and is excluded from actual provider charges.

Tests cover empty/tool-only completions, the published SDK empty model, partial
and failed streams, fragmented UTF-8, large tool payloads, early streaming,
client cancellation, metadata preservation and auth/year denials. The protected
reads remained denied before generation. Successful replies retain their bytes.

[Structured results](darija-empty-reply-fix-results-20261009.json) contain the
three live observations, prompt-free provider usage, fault-injection scope and
source hashes. All academic reads used internal MCP/REST. No academic records
were created or changed. The isolated test process was stopped, four private
captures were removed, and the temporary build was removed, reclaiming about
1,010 MiB. Saved School GPT-OSS 120B settings remain unchanged.

## What this permits next

Keep the existing router and guarded local replies. The empty-response failure
now has a visible, marked outcome, allowing a broader 20B answer-quality check
without silently losing requests. That check must count unavailable notices
as failures and examine returned facts and tool parameters. This targeted work
does not replace the earlier 11/12 populated-role score with a new 12/12 score.
The fresh Jev observation also remains 21/24 classifications with five accepted
correct plans and 19 fallbacks; Jev is still a narrow helper, not a general router.
