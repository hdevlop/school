---
name: najm-dashboard
description: Repo-specific Najm workflow for this School Management System dashboard. Use when editing Najm modules in this repo, or when performing live student, parent, fee, class, section, or settings operations through internal MCP or REST, especially student creation with nested parent and fee data in one request.
---

# Najm Dashboard

Use this skill for work inside this School Management System repo.

## When To Use

- Editing or reviewing Najm backend modules in `packages/server/src/modules`
- Debugging MCP exposure, validation, storage, or auth flows in this repo
- Performing live student, parent, fee, class, section, user, or settings operations
- Working on dashboard forms that depend on Najm REST or MCP behavior

## Mandatory Behavior

- Any agent or sub-agent working on a task covered by this skill must follow this skill in addition to `AGENTS.md`.
- Do not switch to bash, curl, or hand-built JSON payloads for MCP work when PowerShell `Invoke-RestMethod` plus `ConvertTo-Json` will do the job.
- For live dashboard data operations, use internal MCP or internal REST only. Do not use browser automation.
- Login with `auth_login` first, reuse the bearer token, and omit `arguments` for no-input MCP tools.
- Run `tools/list` early when the task depends on exact MCP tool names or schemas. Treat the live registry as source of truth over memory.
- If MCP starts failing with `.next` chunk errors, DTO `ReferenceError`s, or unexplained `500`s, check `.next/dev/logs/next-development.log` and the referenced controller or DTO before changing unrelated code.
- When this skill and a generic workflow conflict, prefer this skill for repo-specific Najm dashboard work.

## Live Data Rules

- Use internal Najm MCP and internal REST only.
- Do not use browser automation for live data operations.
- Assume the app is already running unless a request shows otherwise.
- Reuse existing academic data when safe.
- Prefer realistic Moroccan or Arabic-friendly names unless the user asked for something else.

## MCP Fast Path On Windows

- This repo is usually operated from Windows PowerShell. Prefer PowerShell MCP calls over bash, curl, or shell-specific JSON escaping tricks.
- MCP endpoint: `http://localhost:3000/api/mcp`
- Always send `Accept: application/json, text/event-stream`.
- Login first with `auth_login`, then reuse the returned bearer token for the rest of the session.
- For tools with no input, omit the `arguments` key entirely instead of sending an empty object.
- For tools with optional object input, use `arguments: [ordered]@{}` only when the tool actually expects an object and empty input is valid.
- When testing or debugging MCP writes, call `tools/list` once first and inspect the live `inputSchema` for the target tool before assuming the payload shape.
- Build MCP request bodies with `[ordered]` hashtables plus `ConvertTo-Json -Depth 20`. Do not hand-build JSON strings unless absolutely necessary.
- When a tool returns JSON inside `content[0].text`, parse it with `ConvertFrom-Json -Depth 50` before inspecting fields.

### PowerShell MCP Pattern

```powershell
$payload = [ordered]@{
  jsonrpc = '2.0'
  id = 1
  method = 'tools/call'
  params = [ordered]@{
    name = 'auth_login'
    arguments = [ordered]@{
      email = 'admin@admin.com'
      password = 'ChangeMe123456'
    }
  }
} | ConvertTo-Json -Depth 20

$response = Invoke-RestMethod -Method Post `
  -Uri 'http://localhost:3000/api/mcp' `
  -Headers @{ Accept = 'application/json, text/event-stream' } `
  -ContentType 'application/json' `
  -Body $payload
```

### Local Auth Defaults

- Seeded local admin login is usually `admin@admin.com` / `ChangeMe123456`.
- Seeded or generated dashboard users often use the default password from `packages/server/src/shared/userPassword.ts`. Check that file before guessing.
- Use admin auth for student, parent, class, section, settings, and user-tool work.
- Use accounting-capable auth for fee and fee-type work.

### Transport Choice

- Use MCP first for `auth_*`, `users_*`, `students_*`, `parents_*`, `fees_*`, and `fee-types_*`.
- Use REST for classes, sections, settings, or any `multipart/form-data` flow.
- Do not send files through MCP JSON.
- For MCP-exposed bulk actions, prefer object payloads like `{ ids: [...] }` instead of top-level arrays.
- For MCP bulk deletes or custom action endpoints that need request bodies, prefer `POST` action routes such as `/bulk/delete` over relying on `DELETE` bodies.

### Auth

- Use admin auth for students, parents, classes, sections, settings, and admin user tools.
- Use accounting-capable auth for fees and fee types.
- Only create a temporary accounting-capable user if fee work is blocked and no suitable user exists.

### Student And Parent Notes

- Resolve `classId` and `sectionId` from existing data unless the user explicitly asked to create academic structure.
- Student create can include nested `parents` and nested `fees`.
- Default behavior: when the user asks to create a student and does not explicitly opt out, create the student with at least one parent and at least one fee in the same student create request.
- Prefer one form/request with nested `parents` and nested `fees` instead of creating the student first and attaching parent or fee records later.
- Resolve or reuse an existing `feeTypeId` when needed so the fee can be included in the same request.
- For multipart student or parent requests:
  - append scalar fields as strings
  - append `image` as the file
  - append `parents` as one JSON string
  - append `fees` as one JSON string
- Keep `cin`, `phone`, and `email` unique for parents.
- Only skip nested parent or fee creation when the user explicitly asks to skip it, or when the backend rejects it and a fallback is required.

### Fees And Settings

- Prefer existing fee types before creating new ones.
- Fee status may be recalculated automatically after installment generation.
- If fee creation fails because settings are missing `startMonth` or `endMonth`, repair settings first.

### MCP Failure Recovery

- If a live MCP call starts failing with a Next.js `500`, a `.next` chunk stack trace, or a `ReferenceError` for a DTO or symbol, inspect `.next/dev/logs/next-development.log` before assuming the active feature patch is wrong.
- Search the referenced controller and related DTO files for the missing symbol first. Hot reload can expose stale MCP-safe DTO gaps, especially in controller-level MCP schemas.
- For file-capable MCP DTOs, keep `image` fields as `z.string().nullish()` so REST multipart flows and MCP schemas stay compatible.
- If `tools/list` shows `{}` for a tool that should take structured input, suspect an MCP-unfriendly DTO shape first.
- For MCP-exposed tools, avoid using a top-level `z.array(...)` body schema.
- If HTTP compatibility requires a legacy array body, keep a second normalized HTTP schema or route and expose the MCP tool with a plain object schema such as `z.object({ ids: z.array(z.string().min(1)).min(1) })`.
- Avoid putting `z.preprocess(...)` directly on the schema used by an MCP-exposed tool when accurate `tools/list` JSON schema matters. Use a plain MCP schema and keep preprocessing in an HTTP-only wrapper when needed.
- If a controller method is used by both REST and MCP but the transport response should be a shaped summary instead of the raw entity, keep the service transport-agnostic and do the shaping in the controller or a tiny pure helper.
- If a PowerShell MCP call fails, check these in order:
  1. wrong endpoint or missing `Accept` header
  2. missing or expired bearer token
  3. `arguments` included for a no-input tool
  4. hand-written JSON escaping issues
- If code and tests look correct but live `tools/list` still shows the old tool schema or route metadata, relaunch the dev server and rerun `tools/list` before assuming the fix failed.
- Restart the dev server only after checking the controller and log output. Prefer fixing the actual missing symbol or schema mismatch first.

### Response Style For Live Ops

Return only the important result:

- entity ids
- final names
- linked parent ids
- fee ids and resulting status
- image path used
- one short note for any automatic correction or side effect

## Backend Rules

Follow the Najm module pattern already used in this repo:

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

### Responsibilities

- Controller: transport, auth decorators, validation decorators, MCP decorators, response metadata
- Service: business logic, orchestration, cross-repository coordination
- Repository: raw database queries only
- Validator: reusable domain assertions and guardrails
- DTO: Zod schemas and DTO types

### Core Conventions

- Keep controllers thin.
- Keep business logic in services.
- Keep raw database queries in repositories.
- Keep reusable assertions in validators.
- Keep DTO and Zod schemas in `*Dto.ts`.
- Share one service implementation across REST and MCP.
- Keep authorization in controllers and policy helpers, not repositories.

### Najm-Specific Rules

- In Next.js integration, use `.load(moduleObject)`, not `.scan()`.
- Use `@Validate(...)` for request validation.
- Use `@McpTool(...)` only when the route should be exposed to MCP.
- Use `@ToolGroup(...)` when grouped MCP names improve clarity.

### Files And Validation

- For file-capable DTOs, use `image: z.string().nullish()` instead of `z.instanceof(File)`.
- Najm validation strips file fields before Zod validation and restores them after validation.
- Storage namespaces must be simple names with no path separators.
- Put entity type in the namespace and `{id}_{purpose}.{ext}` in `filePath`.
- Good example: `storage.processFile('students', file, { filePath: \`${studentId}_avatar.png\` })`

## Frontend Rules

- Preserve the existing design system unless the user explicitly wants a redesign.
- Prefer existing `useEntityCRUD`, API service, and form-data helper patterns.
- Keep forms consistent with `NForm`, `StepForm`, and the current multi-step flows.
- Respect React Query for server state and Zustand for shared client state.

## Verification

- Run the smallest relevant verification first.
- Use `bun run lint` after meaningful frontend or TypeScript changes.
- Use `bun run build` when the change could affect production behavior.
- For server-only TypeScript changes, prefer `.\node_modules\.bin\tsc -p packages/server/tsconfig.json --noEmit` before a full build.
- Do not run destructive database commands unless the user explicitly asked for that outcome.

## Ground Truth Files

Check these when behavior matters more than docs:

- `packages/server/src/modules/students/StudentController.ts`
- `packages/server/src/modules/students/StudentService.ts`
- `packages/server/src/modules/parents/ParentController.ts`
- `packages/server/src/modules/parents/ParentService.ts`
- `packages/server/src/modules/financial/fees/FeeController.ts`
- `packages/server/src/modules/financial/fees/FeeService.ts`
- `packages/server/src/modules/financial/fees/FeeValidator.ts`
- `packages/server/src/modules/financial/feeTypes/FeeTypeController.ts`
- `packages/server/src/modules/financial/payments/PaymentController.ts`
- `packages/server/src/modules/financial/payments/PaymentService.ts`
- `packages/server/src/modules/financial/payments/PaymentValidator.ts`
- `packages/server/src/modules/financial/allocations/AllocationRepository.ts`
- `packages/server/src/modules/auth-tools/UserToolsController.ts`
- `packages/server/src/modules/settings/SettingsController.ts`
- `packages/server/src/shared/userPassword.ts`
- `apps/dashboard/src/services/http.ts`
- `apps/dashboard/src/services/formDataHelper.ts`
- `apps/dashboard/src/features/Students/components/FullStudentForm.tsx`
