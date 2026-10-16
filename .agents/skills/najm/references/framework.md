# Najm framework reference

najm-api is a TypeScript decorator-based web framework built on Hono.js. It provides dependency injection (via `diject`), 40+ parameter decorators, guards, transactions, events, i18n, MCP support, and CLI tooling. Targets Bun runtime with Node.js fallback.

**Local source (read-only reference):** `C:\Users\hdevlop\Desktop\najm`

Consult it to understand internals. Never make School consume it: no workspace
link, no `file:` dependency, no copied source, no tarball. School upgrades only
by pinning a published version in the root `package.json` (see `publishing.md`).

**School overrides the generic examples below.** `CLAUDE.md` → Framework
Contracts wins wherever they differ: `own`/`Owned` come from
`packages/server/src/auth.ts`, never najm-auth; ownership is one condition
inside one `.where()`; every route states its guard and a guard names a
permission, not a role; year-scoped controllers are registered in
`packages/server/src/config/yearScope.ts`.

---

## Package Overview

All packages live under `C:\Users\hdevlop\Desktop\najm\packages/`:

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

Write modules with a small, predictable structure. Prefer extending the nearest existing project pattern instead of inventing a new one. School's modules live in `packages/server/src/modules`.

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
- No tool name may be a prefix of another (`getTeacher` vs `getTeacherCount`); a School test rejects prefix pairs, so name single-record tools `...ById`.

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

### MCP-Safe DTOs

- `z.instanceof(File)` cannot be serialized to JSON Schema — MCP throws at startup. Use `image: z.string().nullish()` (see File/Blob handling below).
- Do not use a top-level `z.array(...)` body for an MCP tool. Use an object such as `z.object({ ids: z.array(z.string().min(1)).min(1) })`; if HTTP needs a legacy array body, keep a second HTTP-only schema or route.
- Avoid `z.preprocess(...)` directly on an MCP tool's schema when an accurate `tools/list` schema matters; keep preprocessing in an HTTP-only wrapper.
- Prefer `POST` action routes (`/bulk/delete`) over `DELETE` with a body for MCP bulk actions.
- If `tools/list` shows `{}` for a tool that should take structured input, suspect an MCP-unfriendly DTO shape.
- When REST and MCP share a method but the response should be a shaped summary, keep the service transport-agnostic and shape in the controller or a tiny pure helper.

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

**Never use `.scan()` in Next.js** — it uses dynamic filesystem imports that fail in bundled environments. Use `.load(moduleObject)` instead. School's server is `packages/server/src/index.ts`.

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

School's config is `packages/server/src/config/mcpConfig.ts` (najm-auth bearer auth, year hooks for every group in `yearScope.ts`).

```typescript
import { mcp } from 'najm-mcp';

export const server = new Server()
  .use(mcp({ name: 'sms-mcp', version: '1.0.0', path: '/mcp', cors: true }))
  .use(storage({ mcp: true }))
  .base('/api')
  .load(modulesModule);
```

MCP over HTTP requires **both** `application/json` and `text/event-stream` in `Accept`. Calling tools against the running app is covered in `dashboard-ops.md`.

### Env Setup in Monorepo

Next.js only loads `.env` from the app directory, not the monorepo root:

```bash
cp apps/dashboard/.env.local.example apps/dashboard/.env.local
```
