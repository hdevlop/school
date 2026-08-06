---
name: najm
description: Najm framework reference and dashboard data operator. Use when authoring, reviewing, publishing, or debugging najm modules — or when executing student, parent, fee, class, section, or settings operations against the running app via MCP or REST.
---

# Najm — Framework Reference & Dashboard Operator

## What is najm?

najm-api is a TypeScript decorator-based web framework built on Hono.js. It provides dependency injection (via `diject`), 40+ parameter decorators, guards, transactions, events, i18n, MCP support, and CLI tooling. Targets Bun runtime with Node.js fallback.

**Local source:** `C:\Users\pc\Desktop\libs\najm` (monorepo)

---

## Package Overview

All packages live under `C:\Users\pc\Desktop\libs\najm\packages/`:

| Package | Purpose |
|---|---|
| `najm-core` | Server, DI container, boot system, errors, logging |
| `najm-api` | Re-export bundle (convenience import) |
| `najm-guard` | Authorization — `@Guards`, guard execution |
| `najm-validation` | Request validation — `@Validate` decorator, Zod schemas, File-aware body parsing |
| `najm-cache` | Cache plugin |
| `najm-rate` | Rate limiting with route-scoped keys |
| `najm-cors` | CORS plugin |
| `najm-cookies` | Cookie management |
| `najm-i18n` | Internationalization |
| `najm-mcp` | MCP (Model Context Protocol) tool exposure |
| `najm-event` | Event system — `@On`, `@Events` |
| `najm-database` | Database & transactions — `@DB`, `@Transaction` |
| `najm-storage` | File storage — local/DB providers, namespace-based, MCP tools, `processFile()` DX |
| `najm-email` | Email integration |
| `najm-auth` | JWT auth, RBAC, PBAC, built-in controllers |
| `najm-cli` | CLI scaffolding and code generation |

**Dependency chain:** All packages depend on `najm-core` → `diject` (external).

---

## Module Authoring

Write modules with a small, predictable structure. Prefer extending the nearest existing project pattern instead of inventing a new one.

### Choose The Smallest Useful Shape

**Full Domain Module** — use for persisted business domains with real CRUD, ownership, validation, or orchestration:

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

**Lightweight Module** — use for utility, health, summary, or simple action modules:

```text
module-name/
  ModuleController.ts
  ModuleService.ts
  index.ts
```

Do not create `Repository` or `Validator` files unless they improve clarity.

### Layer Responsibilities

- `Controller`: transport, decorators, auth entrypoints, validation decorators, MCP decorators, response metadata.
- `Service`: business logic, orchestration, cross-repository coordination, events.
- `Repository`: persistence and database queries only.
- `Validator`: reusable domain guardrails — existence checks, allowed-state checks, ownership preconditions, post-write sanity checks.
- `Dto`: TypeScript DTO types plus Zod schemas.
- `Schema`: Drizzle tables and inferred types.
- `index.ts`: public exports for the module.

Keep each layer focused. Do not let database logic leak into controllers, and do not let transport concerns leak into repositories.

### Core Rules

- Keep controllers thin. Parse input and delegate immediately.
- Keep raw queries inside repositories.
- Keep orchestration and events inside services.
- Keep reusable domain assertions inside validators.
- Keep Zod schemas in `Dto.ts` unless a schema is tiny and used once.
- Keep naming consistent: `ProductController`, `ProductService`, `ProductRepository`, and so on.
- Reuse Najm decorators and plugins instead of building custom glue.
- Share one service implementation across REST and MCP. Do not duplicate business logic for MCP.

### Controller Conventions

- Use `@Controller('/resource')` on the class.
- Use `@Validate(schema)` for body-only validation.
- Use `@Validate({ params, body })` when both route params and body need validation.
- Use `@ResMsg(...)` when the project uses translated or standardized response messages.
- Use `@User('id')` when only the current actor id is needed.
- Use project auth decorators such as `@Policy(...)`, `@CanList()`, `@CanRead()`, `@CanCreate()`, `@CanUpdate()`, and `@CanDelete()` when the module is authorization-aware.

### Auth And Ownership Pattern

Define the ownership policy once near the top of the controller and reuse it on methods:

```ts
const Product = own(productsTable)
  .for('user', where(productsTable.userId));

@Policy(Product)
@Controller('/products')
export class ProductController {}
```

Keep authorization rules out of repositories.

### MCP Guidance

- `@McpTool(...)` exposes a controller method to MCP.
- `@ToolGroup(...)` is optional — it only prefixes tool names.
- If a route should stay REST-only, omit `@McpTool(...)`.
- Share the same service logic between REST and MCP — never duplicate it.

```ts
@ToolGroup('cart')
@Controller('/cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get('/')
  @McpTool('Get the authenticated user cart')
  async getMyCart(@User('id') userId: string) {
    return this.cartService.getMyCart(userId);
  }
}
```

Without `@ToolGroup`, the MCP tool name is `get_my_cart`. With it, `cart_get_my_cart`.

### File Patterns

**`ModuleSchema.ts`**
```ts
export const itemsTable = sqliteTable('items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;
```

**`ModuleDto.ts`**
```ts
import { z } from 'zod';

export const createItemDto = z.object({ name: z.string().min(1) });
export const updateItemDto = createItemDto.partial();
export const itemIdParam = z.object({ id: z.string().uuid('Invalid item ID') });

export interface CreateItemDto { name: string }
export interface UpdateItemDto { name?: string }
```

**`ModuleRepository.ts`**
```ts
@Repository()
export class ItemRepository {
  @DB() private db!: TDb;

  async findById(id: string): Promise<Item | undefined> {
    const [item] = await this.db.select().from(itemsTable).where(eq(itemsTable.id, id));
    return item;
  }
}
```

**`ModuleValidator.ts`**
```ts
@Service()
export class ItemValidator {
  constructor(private repository: ItemRepository) {}

  async ensureExists(id: string): Promise<Item> {
    const item = await this.repository.findById(id);
    if (!item) Err(404, 'Item not found');
    return item;
  }
}
```

**`ModuleService.ts`**
```ts
@Service()
export class ItemService {
  constructor(
    private repository: ItemRepository,
    private validator: ItemValidator,
  ) {}

  async getById(id: string) { return this.validator.ensureExists(id); }
  async create(data: CreateItemDto & { userId: string }) { return this.repository.create(data); }
}
```

**`ModuleController.ts`**
```ts
const Item = own(itemsTable).for('user', where(itemsTable.userId));

@ToolGroup('items')
@Policy(Item)
@Controller('/items')
export class ItemController {
  constructor(private itemService: ItemService) {}

  @Get('/:id')
  @CanRead()
  @McpTool('Fetch one item by id')
  @Validate({ params: itemIdParam })
  @ResMsg('items.retrieved')
  async getById(@Params('id') id: string) {
    return this.itemService.getById(id);
  }

  @Post('/')
  @CanCreate()
  @McpTool('Create a new item')
  @Validate(createItemDto)
  @ResMsg({ message: 'items.created', status: 201 })
  async create(@Body() body: CreateItemDto, @User('id') userId: string) {
    return this.itemService.create({ ...body, userId });
  }
}
```

**`index.ts`**
```ts
export * from './ModuleSchema';
export * from './ModuleDto';
export { ModuleRepository } from './ModuleRepository';
export { ModuleValidator } from './ModuleValidator';
export { ModuleService } from './ModuleService';
export { ModuleController } from './ModuleController';
```

### Module Creation Workflow

1. Decide full or lightweight shape.
2. Define `Schema.ts` if persistence is needed.
3. Define Zod schemas and DTO types in `Dto.ts`.
4. Write repository methods for raw persistence access.
5. Write validator checks for reusable domain rules.
6. Write service methods for business behavior.
7. Write controller methods with decorators, validation, auth, and optional MCP exposure.
8. Export via `index.ts`.
9. Register the module in the parent barrel or server loader.
10. Add tests for auth, validation, and MCP behavior when relevant.

### Module Authoring Checklist

- Module shape matches the problem size.
- Each file has one clear responsibility.
- Validation lives in Zod schemas and validators, not scattered across layers.
- Business logic lives in the service, not the controller.
- Persistence stays in the repository.
- Auth is expressed through decorators and policy helpers.
- MCP exposure is explicit through `@McpTool(...)`.
- Module barrel exports the public pieces.
- Project's main barrel or server loader includes the new module.

---

## Server Setup (Next.js Integration)

```typescript
// src/server.ts
import 'reflect-metadata';
import { Server, handle } from 'najm-core';
import { database } from 'najm-database';
import { auth } from 'najm-auth';
import * as features from './features';

export const server = new Server()
  .use(database({ default: db }))
  .use(auth({ dialect: 'pg', jwt: { ... } }))
  .base('/api')
  .load(features);

// app/api/[...route]/route.ts
export const GET = handle(server);
export const POST = handle(server);
```

**Never use `.scan()` in Next.js** — it uses dynamic filesystem imports that fail in bundled environments. Use `.load(moduleObject)` instead.

### Key Decorators

**Class:** `@Controller('/path')`, `@Service()`, `@Repository('dbName')`, `@Injectable()`  
**Method:** `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Guards()`, `@Transaction()`, `@On('event')`  
**Property:** `@Inject()`, `@DB()`, `@I18n()`, `@Log()`, `@Events()`  
**Parameter:** `@Body()`, `@Params('id')`, `@Query()`, `@User()`, `@Headers()`, `@Cookie()`, `@Ctx()`, `@File()`, `@IP()`, `@Valid()`, `@Filter()`, `@Owner()`, etc.

### Database Schema Composition

Always use `authSchema` from najm-auth — never duplicate auth tables:

```typescript
import { authSchema } from 'najm-auth';

export const schema = {
  ...authSchema,  // users, roles, permissions, tokens, rolePermissions
  students,
  classes,
};
```

---

## najm-validation

The validation plugin validates request data via `@Validate`. Integrates with Zod and handles File/Blob extraction transparently.

### Setup

```typescript
import { validation } from 'najm-validation';

new Server()
  .use(validation())
  .use(validation({ stripUnknown: true, errorStatus: 422, errorFormatter: customFn }))
```

### @Validate Decorator

```typescript
// Body-only (90% use case)
@Post('/')
@Validate(CreateStudentSchema)
create(@Body() data) {}

// Multiple targets
@Put('/:id')
@Validate({
  body: UpdateStudentSchema,
  params: z.object({ id: z.string() }),
  query: z.object({ include: z.string().optional() }),
  stripUnknown: true,
})
update(@Params('id') id, @Body() data) {}
```

### File/Blob Handling — Critical Behavior

The middleware automatically **strips File/Blob fields** before Zod validation, then **restores them** into the validated output.

Flow:
1. Request body parsed (multipart or JSON)
2. File/Blob fields extracted and held aside
3. Remaining data validated against Zod schema (`image: z.string().nullish()` passes because the File was removed)
4. File fields restored → `@Body()` receives `{ ...validatedData, image: File }`

**This is why DTOs use `z.string().nullish()` for images** — it satisfies both MCP JSON Schema serialization AND multipart form uploads.

---

## najm-storage

### Architecture

- **Namespace-based**: Every file belongs to a namespace (flat string, no path separators)
- **Two providers**: `local` (filesystem) or `database` (Drizzle)
- Local provider stores files at: `{basePath}/{namespace}/{filePath}`

### CRITICAL: Namespace Rules

Namespaces must be simple strings — **no path separators**.

```typescript
// VALID:
'abc123', 'student-test', 'JI9X4'

// INVALID (will throw 400):
'students/abc123', 'avatars/students', '../escape'
```

Use the **entity type as namespace** and **`{id}_{purpose}.{ext}`** as filePath:

```typescript
storage.processFile('students', file, { filePath: `${studentId}_avatar.png` });
// → storage/students/{studentId}_avatar.png
```

### processFile() — Smart File Handler

```typescript
async processFile(namespace: string, input, options?: {
  filePath?: string;   // default: 'file.{ext}'
  fallback?: string;   // returned when input is null/undefined
}): Promise<string | null>
```

Resolution logic:
1. Already a stored path (starts with `/`, `http`, `storage/`) → returns as-is
2. `File`/`Blob` → uploads, returns serve path (`/api/{namespace}/files/serve/{filePath}`)
3. null/undefined → returns `options.fallback` or null

```typescript
// Create
const image = await this.storage.processFile('students', data?.image, {
  filePath: `${studentId}_avatar.png`,
  fallback: `/images/student_${genderSuffix}.png`,
});

// Update — same filePath overwrites, no orphans
if (data.image !== undefined) {
  userData.image = await this.storage.processFile('students', data.image, {
    filePath: `${id}_avatar.png`,
    fallback: `/images/student_${genderSuffix}.png`,
  });
}

// Delete — specific file only
this.storage.delete('students', `${id}_avatar.png`).catch(() => {});
```

**IMPORTANT:** Do NOT use `emitDeleted(namespace)` on shared namespaces — it deletes ALL files in that namespace. Use `storage.delete(namespace, filePath)` for individual files.

### Storage Config

```typescript
storage({
  provider: 'local',
  basePath: 'storage',
  servePrefix: '/api',
  maxFileSize: 10 * 1024 * 1024,
  allowedCategories: [FileCategory.IMAGE, FileCategory.PDF],
  enableCascadeDelete: true,
  cacheMaxAge: 31536000,
  mcp: true,
})
```

**Plugin ordering:** `mcp()` must be registered **before** `storage()`.

### Storage REST API (auto-registered)

```
GET    /api/:namespace/files              — list files
GET    /api/:namespace/files/serve/*      — serve binary
POST   /api/:namespace/files/*            — upload
DELETE /api/:namespace/files/*            — delete single
DELETE /api/:namespace/files              — delete all in namespace
```

---

## MCP Plugin Setup

```typescript
import { mcp } from 'najm-mcp';

export const server = new Server()
  .use(mcp({ name: 'sms-mcp', version: '1.0.0', path: '/mcp', cors: true }))
  .use(storage({ mcp: true }))
  .base('/api')
  .load(modulesModule);
```

### Calling MCP Tools (HTTP)

MCP requires **both** `application/json` and `text/event-stream` in Accept:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"students_get_students","arguments":{}}}'
```

### Known Gotcha: `z.instanceof(File)` breaks MCP

`z.instanceof(File)` cannot be serialized to JSON Schema — MCP will throw at startup.

```typescript
// BAD
image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),

// GOOD
image: z.string().nullish(),
```

### Admin Credentials (dev/seed)

```
email:    admin@sms.local
password: ChangeMe123456
Login:    POST /api/auth/login  →  returns accessToken
```

### MCP Tools Registered

| Module | Tools |
|--------|-------|
| students | `get_students`, `get_student`, `create`, `update`, `delete`, `delete_bulk`, `delete_all` |
| teachers | `get_teachers`, `get_teacher`, `get_by_cin`, `get_by_email`, `get_by_phone`, `get_classes`, `get_students`, `create`, `update`, `delete`, `delete_bulk`, `delete_all` |
| parents | `get_parents`, `get_parent`, `get_by_cin`, `get_by_phone`, `get_children`, `create`, `link_student`, `update`, `delete`, `delete_bulk`, `unlink_student`, `delete_all` |

Tool name format: `{group}_{method_snake_case}` — e.g. `students_get_student`, `parents_link_student`

### Env Setup in Monorepo

Next.js only loads `.env` from the app directory, not the monorepo root:

```bash
cp .env apps/dashboard/.env.local
```

---

## Dashboard Operations

This section covers executing live operations against the running app. Prefer doing the work directly and returning a short result.

### Rules

- Use internal Najm MCP and internal REST only.
- Never use Chrome DevTools or browser automation for these tasks.
- Assume the app is already running unless a request proves otherwise.
- Prefer existing seeded data over creating extra setup records.
- Do not create placeholder names like `Test Student` unless the user explicitly asks.
- Prefer realistic Moroccan or Arabic-friendly names when the user does not care about exact names.
- Do not ask follow-up questions unless blocked by a required value you cannot discover from the current system state.

### Transport Choice

Use MCP first when the target feature has `@McpTool`.

Use internal REST instead when:
- the module is not exposed through MCP
- the action needs `multipart/form-data`
- a file upload is involved

**MCP-first entities:** `auth_*`, `users_*`, `students_*`, `parents_*`, `fees_*`, `fee-types_*`

**REST-only or REST-preferred:**
- `GET /api/classes` and `GET /api/classes/:id/sections`
- `GET /api/sections`
- `GET /api/settings/admin`, `POST /api/settings`, `PUT /api/settings`
- `POST/PUT /api/students` and `POST/PUT /api/parents` when a file is included

### Auth

- Admin auth for students, parents, classes, sections, settings, and admin user tools.
- Financial or accounting-capable auth for fees and fee types.
- Prefer existing users first; only create a temporary accounting-capable user if fee work is blocked.
- MCP login tool: `auth_login` — endpoint `POST /api/mcp`, Accept: `application/json, text/event-stream`

### Student Workflow

Required fields: `classId`, `sectionId`, `studentCode`, `name`, `email`, `address`, `gender`, `enrollmentDate`

- Resolve `classId` and `sectionId` from existing data.
- Student create supports nested `parents` and nested `fees`.
- Student update can replace the avatar by sending a new `image` file.

**Multipart rules:** scalar fields as strings, `image` as file, `parents` and `fees` each as one JSON string.

### Parent Workflow

Required fields: `name`, `phone`, `address`, `cin`, `relationshipType`

Keep `cin`, `phone`, and `email` unique. Nested parent processing can: link by ID, reuse by `cin`, reuse by `phone`, or create and link.

### Fee Workflow

- Fee create needs: `studentId`, `feeTypeId`, `schedule`
- Valid schedule values: `monthly`, `quarterly`, `semester`, `annually`, `oneTime`
- Do not rely on submitted fee `status` — the service may recalculate it to `overdue`, `partiallyPaid`, or `paid` after installment generation.

### Files And Avatars

- Do not send files through MCP JSON — use REST multipart.
- Student avatars: `students/{studentId}_avatar.png`
- Parent avatars: `parents/{parentId}_avatar.png`
- Reuse the same `{id}_avatar.png` path on updates — the old file is overwritten cleanly.

### Project Gotchas

- The frontend `toFormData` helper stringifies arrays and objects before multipart submission. Mirror that behavior when calling REST directly.
- If fee creation fails because settings are missing `startMonth` or `endMonth`, repair settings first through REST.
- Keep cleanup conservative. Do not delete unrelated records just because they look synthetic.

### Ground Truth Files

If behavior drifts, verify against:

- `src/server/modules/students/StudentController.ts` / `StudentService.ts`
- `src/server/modules/parents/ParentController.ts` / `ParentService.ts`
- `src/server/modules/financial/fees/FeeController.ts` / `FeeService.ts`
- `src/server/modules/financial/feeTypes/FeeTypeController.ts`
- `src/server/modules/settings/SettingsController.ts`

### Response Format

Return only: entity IDs, final names, linked parent IDs, fee IDs and resulting status, image path used, and one short note for any automatic correction or side effect.

---

## Build, Bump & Publish

### Package Order

```
najm-core → najm-api → najm-guard → najm-validation → najm-cache → najm-rate →
najm-cors → najm-cookies → najm-i18n → najm-mcp → najm-event → najm-database →
najm-storage → najm-email → najm-auth → najm-cli
```

### Commands

```bash
cd C:\Users\pc\Desktop\libs\najm

bun run build              # All packages (turbo parallel)
bun run build:<name>       # Single package
bun run test               # All packages
bun run test:<name>        # Single package
bun run clean
```

### Publish a Single Package

```bash
bun scripts/publish-package.ts <name> [--patch|--minor|--major] [--dry-run] [--no-build] [--tag <tag>] [--otp <code>]

# Shortcuts (--patch bump):
bun run pub:core / pub:auth / pub:mcp  # etc.
```

### Publish All Packages

```bash
bun scripts/publish-all.ts --patch
bun scripts/publish-all.ts --from najm-rate   # resume from a specific package
bun scripts/publish-all.ts --dry-run
```

**NEVER run `npm publish` or `bun publish` directly** — `workspace:*` deps must be resolved to real semver first.

### Common Publish Errors

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

---

## Updating najm in This Project

```bash
cd "C:\Users\pc\Desktop\projects\student management system\dashboard"
bun update najm-core najm-api najm-auth najm-database najm-guard najm-event najm-mcp najm-cache najm-rate najm-cors najm-cookies najm-i18n najm-validation najm-storage najm-email
```

After updating:
1. `bun run db:check` — detect schema drift (especially after najm-auth updates)
2. `bun run build` — verify compatibility
3. `bun run dev` — smoke test
