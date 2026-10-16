---
name: najm
description: Najm framework reference. Use when authoring, reviewing, publishing, or debugging najm server modules, MCP exposure, validation, storage, or Najm package internals, or when upgrading Najm in this repo. For live student, parent, fee, class, section, or settings data operations, use najm-ops instead.
---

# Najm — Framework Reference

The detail lives in shared reference files (also used by Codex). Read **only**
the one the task needs (paths are from the repository root):

| Task | Read |
|---|---|
| Authoring, reviewing or debugging a server module: layers, decorators, auth/ownership, `@Validate`, MCP-safe DTOs, storage, server setup | `.agents/skills/najm/references/framework.md` |
| Building or publishing a Najm package, or upgrading Najm in School | `.agents/skills/najm/references/publishing.md` |
| Live data operations against the running app | use the `najm-ops` skill (`.agents/skills/najm/references/dashboard-ops.md`) |

## Always

- Najm source is read-only reference at `C:\Users\hdevlop\Desktop\najm\packages\<pkg>\src`
  (DI in `C:\Users\hdevlop\Desktop\diject\src`). Never read `node_modules/najm-*`,
  and never make School consume the local source; School pins published versions.
- `CLAUDE.md` → Framework Contracts overrides any generic Najm example.
