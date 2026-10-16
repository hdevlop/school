# Build, bump & publish Najm — and adopt it in School

## Package Order

```
najm-core → najm-api → najm-guard → najm-validation → najm-cache → najm-rate →
najm-cors → najm-cookies → najm-i18n → najm-mcp → najm-event → najm-database →
najm-storage → najm-email → najm-auth → najm-cli
```

## Commands

```bash
cd C:\Users\hdevlop\Desktop\najm

bun run build              # All packages (turbo parallel)
bun run build:<name>       # Single package
bun run test               # All packages
bun run test:<name>        # Single package
bun run clean
```

## Publish a Single Package

```bash
bun scripts/publish-package.ts <name> [--patch|--minor|--major] [--dry-run] [--no-build] [--tag <tag>] [--otp <code>]

# Shortcuts (--patch bump):
bun run pub:core / pub:auth / pub:mcp  # etc.
```

## Publish All Packages

```bash
bun scripts/publish-all.ts --patch
bun scripts/publish-all.ts --from najm-rate   # resume from a specific package
bun scripts/publish-all.ts --dry-run
```

**NEVER run `npm publish` or `bun publish` directly** — `workspace:*` deps must be resolved to real semver first.

## Common Publish Errors

| Error | Cause | Fix |
|---|---|---|
| `npm ERR! 403` | Not authenticated | `npm login` |
| `Cannot publish over previously published version` | Version already exists | Add `--patch`/`--minor`/`--major` |
| `workspace:* in published tarball` | Used raw `npm publish` | Use the publish scripts |
| `Missing value for --from` | Forgot package name | `bun scripts/publish-all.ts --from najm-rate` |

- **patch** — bug fixes, small tweaks
- **minor** — new features, non-breaking additions
- **major** — breaking API changes

For cross-package changes: bump and publish `najm-core` first, then dependent packages.

## Updating Najm in School

School pins every Najm package to an exact version; never `bun update` by range.

1. In the root `package.json`, set the exact new version and the matching root `overrides` entry; every workspace that depends on the package pins the same version.
2. `bun install` from the repository root.
3. `bun run test:boundaries` — checks the pins and overrides (`scripts/tests/najm-pins.test.mjs`).
4. `bun run db:check` — detect schema drift (especially after najm-auth updates).
5. `bun run typecheck` and `bun run build` — verify compatibility.
6. `bun run dev` — smoke test.
