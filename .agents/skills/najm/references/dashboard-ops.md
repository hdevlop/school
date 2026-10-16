# Dashboard operations (live data via MCP / REST)

Executing student, parent, fee, class, section, user, or settings operations
against the running app. Do the work directly and return a short result.

## Rules

- Use internal Najm MCP and internal REST only. Never use Chrome DevTools or browser automation for these tasks.
- Assume the app is already running (dev server on port `3102`) unless a request proves otherwise.
- Prefer existing seeded data over creating extra setup records; reuse academic data when safe.
- Do not create placeholder names like `Test Student` unless the user explicitly asks. Prefer realistic Moroccan or Arabic-friendly names when the user does not care about exact names.
- Do not ask follow-up questions unless blocked by a required value you cannot discover from the current system state.
- Keep cleanup conservative. Do not delete unrelated records just because they look synthetic.
- Do not run destructive database commands unless the user explicitly asked for that outcome.

## Auth

- Seeded local admin: `admin@admin.com` / `School2026` (`packages/seed/src/scripts/admin/adminSeedConfig.ts`).
- Seeded or generated dashboard users often use the default password from `packages/server/src/shared/userPassword.ts`. Check that file before guessing.
- Admin auth for students, parents, classes, sections, settings, and user management.
- Financial or accounting-capable auth for fees and fee types. Prefer existing users; only create a temporary accounting-capable user if fee work is blocked and no suitable user exists.
- Login through `POST /api/auth/login`, then reuse the access token as a bearer token. Authentication is not exposed as MCP tools.

## Transport Choice

Use MCP first when the target feature has `@McpTool`: `students_*`, `parents_*`, `fees_*`, `fee-types_*`.

Use internal REST instead when:
- the module is not exposed through MCP — user, role and permission management uses Najm's built-in REST routes
- the action needs `multipart/form-data` or a file upload — never send files through MCP JSON

REST-only or REST-preferred:
- `GET /api/classes` and `GET /api/classes/:id/sections`
- `GET /api/sections`
- `GET /api/settings/admin`, `POST /api/settings`, `PUT /api/settings`
- `POST/PUT /api/students` and `POST/PUT /api/parents` when a file is included

## MCP Calls

- Endpoint: `http://localhost:3102/api/mcp`. Always send `Accept: application/json, text/event-stream`.
- Run `tools/list` once early when exact tool names or schemas matter. The live registry is the source of truth; tool names change (no name may prefix another, so single-record tools end in `ById`).
- Tool name format: `{group}_{method_snake_case}`, e.g. `students_get_students`, `students_get_student_by_id`.
- Year-scoped tool groups (`packages/server/src/config/yearScope.ts`) take the selected academic year as input.
- For tools with no input, omit `arguments` entirely instead of sending `{}`.
- For bulk actions, send object payloads like `{ ids: [...] }`, not top-level arrays.
- When a tool returns JSON inside `content[0].text`, parse it before inspecting fields.

### PowerShell pattern (preferred on Windows)

Build bodies with `[ordered]` hashtables plus `ConvertTo-Json -Depth 20`; avoid hand-built JSON strings. Parse tool output with `ConvertFrom-Json -Depth 50`.

```powershell
$loginBody = [ordered]@{ email = 'admin@admin.com'; password = 'School2026' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3102/api/auth/login' `
  -ContentType 'application/json' -Body $loginBody
$accessToken = $login.data.accessToken

$payload = [ordered]@{
  jsonrpc = '2.0'
  id = 1
  method = 'tools/call'
  params = [ordered]@{ name = 'students_get_students' }
} | ConvertTo-Json -Depth 20

$response = Invoke-RestMethod -Method Post -Uri 'http://localhost:3102/api/mcp' `
  -Headers @{ Accept = 'application/json, text/event-stream'; Authorization = "Bearer $accessToken" } `
  -ContentType 'application/json' -Body $payload
```

### curl equivalent

```bash
curl -X POST http://localhost:3102/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Student Workflow

Required fields: `classId`, `sectionId`, `studentCode`, `name`, `email`, `address`, `gender`, `enrollmentDate`

- Resolve `classId` and `sectionId` from existing data unless the user asked to create academic structure.
- Default: when asked to create a student and the user does not opt out, create it with at least one parent and at least one fee **in the same create request** (nested `parents` and `fees`), not by attaching them afterwards. Resolve or reuse an existing `feeTypeId` for this. Skip nesting only when the user asks, or the backend rejects it and a fallback is required.
- Student update can replace the avatar by sending a new `image` file.

**Multipart rules** (mirror the frontend `toFormData` helper in `apps/dashboard/src/services/formDataHelper.ts`): scalar fields as strings, `image` as the file, `parents` and `fees` each as one JSON string.

## Parent Workflow

Required fields: `name`, `phone`, `address`, `cin`, `relationshipType`

Keep `cin`, `phone`, and `email` unique. Nested parent processing can: link by ID, reuse by `cin`, reuse by `phone`, or create and link.

## Fee Workflow

- Fee create needs: `studentId`, `feeTypeId`, `schedule`. Prefer existing fee types before creating new ones.
- Valid schedule values: `monthly`, `quarterly`, `semester`, `annually`, `oneTime`.
- Do not rely on submitted fee `status` — the service may recalculate it to `overdue`, `partiallyPaid`, or `paid` after installment generation.
- If fee creation fails because settings are missing `startMonth` or `endMonth`, repair settings first through REST.

## Files And Avatars

- Student avatars: `students/{studentId}_avatar.png`; parent avatars: `parents/{parentId}_avatar.png`.
- Reuse the same `{id}_avatar.png` path on updates — the old file is overwritten cleanly.

## Failure Recovery

If a call fails, check in order:
1. wrong endpoint or missing `Accept` header
2. missing or expired bearer token
3. `arguments` included for a no-input tool
4. hand-written JSON escaping issues

If MCP fails with a Next.js `500`, a `.next` chunk stack trace, or a `ReferenceError` for a DTO or symbol:
- Inspect `.next/dev/logs/next-development.log`, then search the referenced controller and DTO for the missing symbol before assuming the active patch is wrong. Hot reload can expose stale MCP-safe DTO gaps.
- If code and tests look correct but `tools/list` still shows the old schema, relaunch the dev server and rerun `tools/list`. Restart only after checking the controller and log output.

## Ground Truth Files

If behavior drifts from this file, verify against:

- `packages/server/src/modules/students/StudentController.ts` / `StudentService.ts`
- `packages/server/src/modules/parents/ParentController.ts` / `ParentService.ts`
- `packages/server/src/modules/financial/fees/FeeController.ts` / `FeeService.ts` / `FeeValidator.ts`
- `packages/server/src/modules/financial/feeTypes/FeeTypeController.ts`
- `packages/server/src/modules/financial/payments/PaymentController.ts` / `PaymentService.ts` / `PaymentValidator.ts`
- `packages/server/src/modules/financial/allocations/AllocationRepository.ts`
- `packages/server/src/modules/settings/SettingsController.ts`
- `packages/server/src/shared/userPassword.ts`
- `apps/dashboard/src/services/http.ts`
- `apps/dashboard/src/services/formDataHelper.ts`
- `apps/dashboard/src/features/Students/components/FullStudentForm.tsx`

## Response Format

Return only: entity IDs, final names, linked parent IDs, fee IDs and resulting status, image path used, and one short note for any automatic correction or side effect.
