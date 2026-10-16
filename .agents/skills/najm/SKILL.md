---
name: najm
description: Najm framework reference and dashboard data operator. Use when authoring, reviewing, publishing, or debugging najm modules — or when executing student, parent, fee, class, section, or settings operations against the running app via MCP or REST.
---

# Najm — Framework Reference & Dashboard Operator

The detail lives in reference files. Read **only** the one the task needs
(paths are from the repository root):

| Task | Read |
|---|---|
| Authoring, reviewing or debugging a server module: layers, decorators, auth/ownership, `@Validate`, MCP-safe DTOs, storage, server setup | `.agents/skills/najm/references/framework.md` |
| Live student, parent, fee, class, section, user or settings operations against the running app (MCP / REST) | `.agents/skills/najm/references/dashboard-ops.md` |
| Building or publishing a Najm package, or upgrading Najm in School | `.agents/skills/najm/references/publishing.md` |

## Always

- Najm source is read-only reference at `C:\Users\hdevlop\Desktop\najm\packages\<pkg>\src`
  (DI in `C:\Users\hdevlop\Desktop\diject\src`). Never read `node_modules/najm-*`,
  and never make School consume the local source; School pins published versions.
- `CLAUDE.md` → Framework Contracts overrides any generic Najm example.
- Live data work uses internal MCP or REST only — never browser automation.
