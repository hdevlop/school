---
name: najm-internals
description: Najm package internals lookup. Use to answer how a Najm or diject package behaves inside (najm-auth ownership and registration, guards, router, MCP exposure, storage, validation, DI resolution) by reading its source, or to compare School's pinned Najm versions with the Desktop source. Returns a short answer with file:line citations. For writing or reviewing School code, use najm instead.
model: sonnet
context: fork
---

# Najm internals lookup

Question: $ARGUMENTS

Answer it from the source, then stop.

## Where to look

- Najm packages: `C:\Users\hdevlop\Desktop\najm\packages\<pkg>\src`
- diject (DI): `C:\Users\hdevlop\Desktop\diject\src`
- School's pins: the root `package.json` of the School repo (dependencies and
  `overrides`). Compare a pin with the `version` in the Desktop package's
  `package.json`; report any mismatch, because the Desktop source may then
  differ from what School runs.

Never open, grep or `cat` anything under `node_modules/najm-*` or
`node_modules/diject`. The Desktop repos are read-only: change nothing there or
in School.

## How

1. Grep for the symbol first; read only the functions that answer the question.
2. Follow the call chain only as far as the question needs.
3. If School's `CLAUDE.md` (Framework Contracts) overrides the package's default
   behavior — for example ownership comes from `packages/server/src/auth.ts`,
   not najm-auth — say so.

## Answer format

- The answer in a few sentences.
- Each claim cited as `path:line` (absolute Desktop paths).
- Any version mismatch between a School pin and the Desktop source.
- Anything you could not confirm, stated as unconfirmed.
