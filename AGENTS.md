 # AGENTS.md

Unified repo guide for agentic tools working in this School Management System monorepo.

This file merges the high-signal parts of:
- `CLAUDE.md`
- the `najm` skill (`.claude/skills/najm/SKILL.md`), which covers both the framework reference and live MCP/REST data operations
- the repo-relevant skill guidance for frontend design and React/Next performance

Use this file as the default entry point. Read the deeper files only when a task needs their extra detail.

## Read Order

1. Read this file first.
2. For live data operations, or for backend modules, MCP exposure, storage, validation, or Najm package internals, load the `najm` skill.

## Working Modes

### 1. Live Data Operations

Use this mode when the task is to create, update, delete, or inspect real app data such as students, parents, fees, fee types, classes, sections, users, or settings.

Rules:
- Use internal Najm MCP and internal REST only.
- Do not use Chrome DevTools or browser automation for these tasks.
- Assume the app is already running unless a request proves otherwise.
- Prefer existing seeded academic data over creating extra setup records.
- Prefer realistic Arabic-friendly or Moroccan-friendly names unless the user asks for something else.
- Keep the response short and execution-focused.

Transport rules:
- Use MCP first for entities exposed with `@McpTool`.
- Use REST when the route is not exposed through MCP or when `multipart/form-data` is required.

In this repo, MCP-first entities include:
- `auth_*`
- `users_*`
- `students_*`
- `parents_*`
- `fees_*`
- `fee-types_*`

REST-only or REST-preferred flows include:
- classes and sections lookup
- settings repair or creation
- student or parent create/update with file upload

Auth rules:
- Use admin auth for students, parents, classes, sections, settings, and admin user tools.
- Use financial or accounting-capable auth for fees and fee types.
- Only create a temporary accounting-capable user if fee work is blocked and no suitable user exists.

## Internal MCP Rules

- MCP endpoint: `POST /api/mcp`
- Required Accept header: `application/json, text/event-stream`
- Login tool: `auth_login`
- Reuse existing records whenever safe.
- Do not create obvious placeholders like `Test Student` unless the user explicitly asks.

### Student Create / Update

- Resolve `classId` and `sectionId` from existing data unless the user asked to create academic structure.
- Student create supports nested `parents` and nested `fees`.
- If a file is included, use REST multipart.
- For multipart:
  - append scalar fields as strings
  - append `image` as the file
  - append `parents` as one JSON string
  - append `fees` as one JSON string
- When sending multipart phone values, prefer a `+212...` format so the parser keeps them as strings.

### Parent Create / Update

- Parents can be created separately or nested inside student creation.
- Keep `cin`, `phone`, and `email` unique.
- Nested parent processing may reuse an existing parent by `cin` or `phone`, or create and then link a new parent.

### Fees

- Prefer existing fee types before creating new ones.
- Fee `status` may be recalculated automatically after installment generation.
- If fee creation fails because settings are missing `startMonth` or `endMonth`, repair settings first.

### Files

- Prefer local files from `avatars/` when the user asks for an image and gives no other path.
- Do not send files through MCP JSON.
- Student avatar pattern: `students/{studentId}_avatar.png`
- Parent avatar pattern: `parents/{parentId}_avatar.png`

## Chrome MCP

Project Chrome MCP server:

```json
{
  "mcpServers": {
    "streamable-mcp-server": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:12306/mcp"
    }
  }
}
```

Notes:
- Server identifies as `ChromeMcpServer` version `1.0.0`.
- Use `Accept: application/json, text/event-stream`.
- Plain `GET /mcp` can return `400`; verify with MCP JSON-RPC `initialize`.
- Known tools include `get_windows_and_tabs`, `chrome_navigate`, `chrome_read_page`, `chrome_computer`, `chrome_screenshot`, `chrome_javascript`, and `chrome_network_capture`.
- After adding or changing `.mcp.json`, reload the agent/app session before expecting tools to appear.

## Backend Rules

This project uses Najm with a controller -> service -> repository -> validator pattern.

Core rules:
- Keep controllers thin.
- Keep business logic in services.
- Keep raw database queries in repositories.
- Keep reusable domain assertions in validators.
- Keep DTO and Zod schemas in `*Dto.ts`.
- Reuse one service implementation across REST and MCP.

Typical full module shape:

```text
module-name/
  ModuleSchema.ts
  ModuleDto.ts
  ModuleRepository.ts
  ModuleValidator.ts
  ModuleService.ts
  ModuleController.ts
  index.ts
```

Use a smaller module shape when the feature is lightweight and does not need every layer.

### Najm-Specific Rules

- In Next.js integration, prefer `.load(moduleObject)`. Do not use `.scan()` in bundled app contexts.
- Use `@Validate(...)` for request validation.
- Use `@McpTool(...)` only when the route should be exposed to MCP.
- Use `@ToolGroup(...)` to group MCP tool names when needed.
- Keep authorization in controller and policy layers, not repositories.

### Validation And Files

- For file-capable DTOs, use `image: z.string().nullish()` instead of `z.instanceof(File)`.
- Najm validation strips file fields before Zod validation and restores them afterward.
- This is required for both multipart uploads and MCP JSON schema compatibility.

### Storage Rules

- Storage namespaces must be simple names with no path separators.
- Put entity type in the namespace and `{id}_{purpose}.{ext}` in `filePath`.
- Good: `storage.processFile('students', file, { filePath: \`${studentId}_avatar.png\` })`
- Do not delete a whole shared namespace just to remove one file.

## Frontend Rules

Use the existing feature-based structure and preserve the current product language unless the user asks for a redesign.

Architecture:
- `apps/dashboard/src/app` for routes
- `apps/dashboard/src/features` for feature modules
- `apps/dashboard/src/components` for shared components
- `apps/dashboard/src/services` for API helpers
- `apps/dashboard/src/stores` for Zustand

Patterns:
- Prefer existing `useEntityCRUD` and API service patterns.
- Use the form helpers already in the repo for file-aware POST and PUT requests.
- Respect React Query for server state and Zustand for global client state.
- Keep forms consistent with `NForm`, `StepForm`, and multi-step flows already used in the app.

### Framework Contracts

Single-owner boundaries. A second owner raises no error — it produces two
states that drift apart — so do not add one without changing the plan first.

- **One UI provider.** `apps/dashboard/src/app/providers.tsx` mounts exactly one `NajmAppProvider` from `najm-kit/app`, owning language, theme, design, time zone, branding, formatting, and `NTable` defaults. Never add `NajmDesignProvider`, `next-themes`, a second `I18nProvider`, or a local theme wrapper.
- **One preference source.** `apps/dashboard/src/lib/serverPreferences.ts` resolves cookie → signed-in user → School settings → typed fallback. New preference values belong in `apps/dashboard/src/preferences/`.
- **One session resolution.** Server components use the `serverAuth` singleton in `apps/dashboard/src/lib/session.ts`. Never call `auth.getSession()` directly from a layout or page, and never build the adapter per request.
- **One Next config.** `apps/dashboard/next.config.ts` is the single line `export { default } from "najm-next/config"`. `najm-next` owns the workspace root (pinned for both `turbopack.root` and `outputFileTracingRoot`, because a stray parent lockfile otherwise wins Next's automatic detection), `NAJM_NEXT_DIST_DIR`, `experimental.externalDir`, `poweredByHeader`, the image cache TTL, `reflect-metadata` externalization, and service-worker headers. `allowedDevOrigins` stays empty unless `NAJM_NEXT_DEV_ORIGINS` names hosts. Do not add keys to the file; a genuine divergence uses `defineNajmNextConfig` from `najm-next/configurable`.
- **Sidebar state** belongs to `NSidebarProvider` from `najm-kit`, read with `useNSidebar()`. School has no sidebar store.
- **Translations** live in `packages/server/src/locales/` and serve backend and frontend from one catalog. Run `bun run i18n:check` after adding keys.

### Local Najm Package Sources

- Read installed behavior from `node_modules/najm-*/dist` first. That is what School actually runs.
- A local Najm source checkout may be consulted **read-only** to understand internals. Never make School consume it: no workspace link, no `file:` dependency, no copied source, no tarball. School upgrades only by pinning a published version.
- Najm versions are exact pins in the root `package.json` with a matching `overrides` block. Read the versions there rather than assuming, and never widen a pin to a range.
- `bun run test:dashboard` fails when a second copy of a Najm package resolves, including a stale nested directory that `bun install` left behind. Delete the nested directory and re-run `bun install` to confirm it is not recreated; do not relax the guard.

### Design Guidance

When building or redesigning UI:
- Preserve the existing design system unless the user explicitly wants something new.
- Avoid generic AI-looking layouts.
- Use intentional typography, spacing, and visual hierarchy.
- Make desktop and mobile both work cleanly.

### React / Next Guidance

- Parallelize independent async work.
- Avoid unnecessary client-side waterfalls.
- Keep bundle size in mind and avoid heavy imports when not needed.
- Use transitions for non-urgent updates when it improves UX.
- Do not add memoization everywhere by default. Follow existing patterns and only optimize where it helps.

## Commands

Use the actual root scripts from `package.json`. Bun only — npm, yarn, and pnpm
ignore `bun.lock` and the `overrides` block that pins the Najm versions.

- `bun install`
- `bun run dev`
- `bun run build`
- `bun run build:all`
- `bun run lint`
- `bun run test:server`
- `bun run test:dashboard`
- `bun run test:seed`
- `bun run test:e2e:najm-upgrade`
- `bun run i18n:check`
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:push`
- `bun run db:check`
- `bun run seed:admin`
- `bun run seed:school`
- `bun run seed:demo`
- `bun run seed:full`
- `bun run reset:demo`

Environment: `apps/dashboard/.env.local` is the monorepo's only env file, and
`apps/dashboard/.env.local.example` is the tracked template documenting every
value. `DB_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and
`NAJM_ENCRYPTION_KEY` are required — a build fails while collecting page data
without them. Never commit real values.

Verification rules:
- After code changes, run the smallest relevant verification first.
- Use `bun run lint` after meaningful frontend or TypeScript changes.
- Use `bun run build` when the change could affect production behavior.
- Do not run destructive database commands unless the user explicitly wants that outcome.

## Ground Truth Files

Use these files when behavior matters more than documentation:

- `CLAUDE.md`
- `.claude/skills/najm/SKILL.md`
- `apps/dashboard/.env.local.example`
- `apps/dashboard/src/app/providers.tsx`
- `apps/dashboard/src/lib/session.ts`
- `apps/dashboard/src/lib/serverPreferences.ts`
- `packages/server/src/modules/students/StudentController.ts`
- `packages/server/src/modules/students/StudentService.ts`
- `packages/server/src/modules/parents/ParentController.ts`
- `packages/server/src/modules/parents/ParentService.ts`
- `packages/server/src/modules/financial/fees/FeeController.ts`
- `packages/server/src/modules/financial/fees/FeeService.ts`
- `packages/server/src/modules/financial/feeTypes/FeeTypeController.ts`
- `packages/server/src/modules/settings/SettingsController.ts`
- `apps/dashboard/src/services/http.ts`
- `apps/dashboard/src/services/formDataHelper.ts`
- `apps/dashboard/src/features/Students/components/FullStudentForm.tsx`

## Default Behavior

When no special instruction is given:
- for live data tasks, use internal MCP or internal REST directly and return a short result
- for backend tasks, follow Najm module conventions
- for frontend tasks, preserve the existing UI language and apply solid React/Next performance habits

If a task becomes specialized, load the `najm` skill and continue from there.
