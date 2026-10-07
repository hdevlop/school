# Benchmark error translations — 2026-10-05

The full repository test blocker is fixed. `ChatBenchmarkService` now uses Najm's
request translator (`@I18n('chatBenchmark.errors')`) for its four public error
sites, backed by three shared catalog keys in English, French, Arabic and Spanish.
The English messages retain their existing wording. Provider bodies and private
exception details remain hidden behind the translated generic failure.

The focused checks cover disabled controls, unsupported providers and failed
usage reads in all four languages. They also verify that rejected operations
dispatch no provider request. No live app or provider request was made by this fix.

Verification:

- Focused benchmark/i18n tests: 11 passed, 68 assertions.
- Full `bun run test`: **1,446 passed, zero failures**, 6,743 assertions across
  ten test groups; workspace boundaries passed.
- `bun run i18n:check`: no missing keys in the four catalogs.
- `bun run lint` and `bun run typecheck`: passed.
- `bun run build`: passed, run sequentially after type generation.

Source hashes and check results are in
[verification](benchmark-i18n-verification-20261005.json).

This closes the i18n failure recorded in the previous
[language/readiness follow-up](jev-language-readiness-fix-20261005.md). That
historical result remains unchanged. No Jev classification policy, accuracy
threshold or published dependency was changed. B0 still fails, so Jev remains off;
fresh independent accuracy acceptance precedes the upstream async hook and
end-to-end comparison.
