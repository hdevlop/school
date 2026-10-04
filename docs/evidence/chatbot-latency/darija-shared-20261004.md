# Shared Darija routing helper — 2026-10-04

Published `najm-rag@2.3.0` and adopted it through School's exact root/server
pins, root override and `bun.lock`. School consumes the npm release.
No paid chat/embedding benchmark, database migration or deployment was run.

## Shared API and app ownership

- `createDarijaQueryRewriter` and its `DarijaQueryRewriteOptions` /
  `DarijaRewriteRule` types are exported from `najm-rag` and the pure
  `najm-rag/query-rewrites` subpath.
- The factory contains common Darija question/request/time wording and the
  rewrite engine: vowel-aware literal rules, meaningful shadda, bounded
  dictionary lookups and iterative conjunction handling. It adds no LLM call.
- It is opt-in through the existing `rewriteRoutingQuery` hook. Routing and
  preview embed the rewritten query; the original message, knowledge search
  and tool authorization retain their existing behavior.
- `words` supplies app overrides; `null` disables a preset word. Literal
  `rewriteRules` run before the built-in count rule and word substitutions.
  Configuration is copied when creating a rewriter, isolating app instances.
- School's `darijaRouting.ts` now contains its attendance, grade, payment,
  family/contact and transport words, the marked `علّم` verb, and the rule
  interpreting `الرقم ديال` as a phone number. General wording and engine
  code are supplied by the published dependency.
- Existing semantic phrases are tool-linked example questions. They remain
  separate from literal substitutions that transform routing input.
  Other apps must check their own held-out routing cases after opting in.

## Release evidence

Najm source: `C:\Users\pc\Desktop\najm`.

- Feature commit: `8ea1bca`.
- Packing commit: `49af7f74441bd4dd0d430e8bb13e95aafa11ec03`.
  The second commit fixes the release parser for npm 12's workspace-keyed
  JSON output; old array output remains supported. Its 32 tests pass.
- Built, tested and packed with `scripts/publish-package.ts`; published that
  exact tarball with its matching commit sidecar.
- SHA-256 of both packed and downloaded registry tarballs:
  `6d941647f9cb99e833e3eb7c2c1067033c785230b29a950d627fbdee3b676e09`.
- Registry shasum: `0d0036bd7856aab4203d0a7f402d3dd0e85163e5`.
- Registry integrity, also stored in School's lockfile:
  `sha512-8r89/X+KacTi2Kq3LZsPZ1hbynrZclq+WKi4xpEqmNToFt362j0pUYlYOV4baxWEIutEmJEYyariuKj+6stqtQ==`.

Registry verification used the release script's `--verify-published 2.3.0`
and a direct tarball hash comparison. `bun install --no-cache` refreshed stale
metadata after registry processing completed.

## Verification

- Najm helper tests: **15 passed**; whole `najm-rag` package: **262 passed,
  0 failed**. Package build and public API snapshot check passed.
- School Darija and exact-pin checks: **18 passed, 0 failed**. The app-isolation
  test verifies that grades, marking attendance and phone-number meanings
  are absent from an unconfigured shared helper.
- Output parity against the pre-extraction School implementation: **109/109**.
  Inputs comprise `questions.json` (50), `routing-cases.json` (20),
  `routing-darija-fr.json` (31), and eight vowel/shadda/name/MSA/long-prefix
  cases. The final comparison loaded School's wrapper using the published
  package, without importing upstream source.
- `bun run lint`, `bun run typecheck`, `bun run test`: passed.
- `bun run build`: passed (captured exit code 0), including compilation,
  TypeScript validation, page generation and final route output.
- Runtime imports from both public entrypoints expose the factory successfully.

These are source, packaging and offline compatibility checks. They establish
no new routing accuracy, latency or billing result. Existing live smoke reports
remain dated evidence; the stricter scorer and prompt still need their planned
budgeted live re-run.
