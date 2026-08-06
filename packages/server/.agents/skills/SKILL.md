---
name: najm-module-authoring
description: Scaffold or review Najm server modules in packages/server using this repo's layered structure with controller, service, repository, validator, DTO, optional guards, schema registration, barrel exports, auth decorators, Zod validation, and optional future MCP exposure. Use when creating, refactoring, or reviewing modules under packages/server/src/modules.
---

# Najm Module Authoring

Use this skill when working on `packages/server/src/modules`.

Keep modules small, predictable, and aligned with the nearest existing feature. Prefer extending the local project pattern over inventing a new one.

This skill is portable. Common locations:

- `packages/server/.agents/skills/najm-module-authoring/SKILL.md`
- `<project>/.agents/skills/najm-module-authoring/SKILL.md`
- `~/.codex/skills/najm-module-authoring/SKILL.md`

## Choose The Smallest Useful Shape

Pick the smallest module shape that fits the feature.

### Full Domain Module

Use this for persisted business domains with CRUD, ownership rules, reusable validation, or non-trivial orchestration.

```text
module-name/
  entitySchema.ts
  EntityDto.ts
  EntityGuards.ts        # optional, but common in this repo
  EntityRepository.ts
  EntityValidator.ts
  EntityService.ts
  EntityController.ts
  index.ts
```

### Lightweight Module

Use this for summaries, dashboards, health, simple actions, or orchestration-only modules.

```text
module-name/
  EntityController.ts
  EntityService.ts
  index.ts
```

Do not create `Repository`, `Validator`, or `Guards` files unless they improve clarity.

## Repo Conventions

- Put modules under `packages/server/src/modules`.
- Group modules by domain when the repo already does so, for example `financial/*` or `transport/*`.
- Use PascalCase for controller, service, repository, validator, DTO, and guards files.
- Use lowercase schema filenames such as `studentSchema.ts`, `paymentSchema.ts`, or `vehicleSchema.ts`.
- Keep Drizzle table exports lowercase, for example `students`, `payments`, `vehicles`.
- Export runtime module pieces from the module `index.ts`.
- Export new tables and enums from `packages/server/src/database/schema/index.ts`.

## Layer Responsibilities

- `Controller`: transport, Najm decorators, auth entrypoints, validation decorators, response metadata, optional future MCP decorators.
- `Service`: business logic, orchestration, branching, side effects, and cross-repository coordination.
- `Repository`: persistence and database queries only.
- `Validator`: reusable domain guardrails such as existence checks, uniqueness checks, allowed-state checks, and delete preconditions.
- `Guards`: ownership policies or reusable authorization decorators for a module when route access is not simple role gating.
- `Dto`: Zod schemas plus exported input types inferred from those schemas.
- `Schema`: Drizzle tables, enums, refs, and inferred relations for the module.
- `index.ts`: explicit public exports for the module.

Keep each layer focused. Do not let database logic leak into controllers, and do not let transport concerns leak into repositories.

## Core Rules

- Keep controllers thin. Parse, validate, authorize, and delegate immediately.
- Keep raw queries inside repositories.
- Keep orchestration and side effects inside services.
- Keep reusable domain assertions inside validators.
- Keep Zod schemas in `EntityDto.ts`.
- Keep ownership and permission helpers in `EntityGuards.ts` when they are reused across routes.
- Reuse helpers from `@server/shared/fields`, `@server/shared/enums`, and `@server/database/shared` before creating new primitives.
- Prefer `z.input<typeof schema>` exported types over handwritten DTO interfaces unless a standalone interface is genuinely clearer.
- Share one service implementation across every transport surface. Do not duplicate business logic.

## Controller Conventions

- Import Najm decorators from `@server/najm`.
- Use `@Controller('/resource')` on the class.
- Use `@Validate(schema)` for body-only validation.
- Use `@Validate({ params, body })` when both route params and body need validation.
- Use `@ResMsg('module.success.someKey')` for standardized translated responses.
- Use `@User()` in this repo when the service needs actor context; pass only the needed fields into the service.
- Use simple auth decorators from `@server/auth` for role-only endpoints, for example `@isAuth()`, `@isAdmin()`, `@isAdministrator()`, or group guards like `@isFinancial()`.
- Use `@Policy(...)` with `@CanList()`, `@CanRead()`, `@CanCreate()`, `@CanUpdate()`, and `@CanDelete()` when the module has ownership-aware access rules.
- If a controller needs to return a transport-specific summary while the service should keep returning the domain entity, shape that response in the controller or a tiny pure helper instead of changing the service contract for every caller.

Example:

```ts
import { Body, Controller, Get, Params, Post, ResMsg, Validate } from '@server/najm';
import { StudentService } from './StudentService';
import { Student, Policy, CanRead, CanCreate } from './StudentGuards';
import { createStudentDto, studentIdParam, type CreateStudentDto } from './StudentDto';

@Policy(Student)
@Controller('/students')
export class StudentController {
  constructor(private studentService: StudentService) {}

  @Get('/:id')
  @CanRead()
  @Validate({ params: studentIdParam })
  @ResMsg('students.success.retrieved')
  async getStudent(@Params('id') id: string) {
    return this.studentService.getById(id);
  }

  @Post()
  @CanCreate()
  @Validate(createStudentDto)
  @ResMsg('students.success.created')
  async create(@Body() body: CreateStudentDto) {
    return this.studentService.create(body);
  }
}
```

## Auth And Ownership Pattern

If the resource is ownership-aware, define the policy once in `EntityGuards.ts` and reuse it in the controller.

```ts
import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from '@server/auth';
import { own, where } from 'najm-auth';
import { students } from '@server/database/schema';

export const Student = own(students)
  .for('student', where(students.userId));

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
```

If the module needs custom decorator-style guards instead of `Policy`, follow the local module pattern and keep those wrappers in `EntityGuards.ts`.

Keep authorization rules out of repositories.

## Optional MCP Guidance

This package does not currently expose MCP decorators in existing modules, but if MCP exposure is added later:

- Keep REST and MCP on the same controller/service path.
- Expose the controller method instead of cloning service logic.
- Treat MCP decorators as transport metadata only.
- Keep the service layer transport-agnostic.
- Verify the live tool name and schema with `tools/list` before trusting memory or comments.
- Prefer plain JSON-schema-friendly body DTOs for MCP, especially `z.object(...)` payloads.
- Avoid top-level `z.array(...)` body schemas for MCP-exposed tools.
- Avoid using `z.preprocess(...)` as the direct schema for an MCP-exposed tool when accurate MCP schema generation matters.
- If HTTP compatibility still needs a legacy raw-array body, keep a separate normalized HTTP schema or route and reserve the plain object schema for the MCP-exposed method.
- For bulk deletes or custom actions that need request bodies, prefer `POST` action routes such as `/bulk/delete` over `DELETE` routes with bodies.
- After changing an MCP DTO, validation decorator, or tool-decorated route, relaunch dev if needed and rerun `tools/list` to confirm the registry picked up the new shape.

## File Patterns

### `entitySchema.ts`

- Define the Drizzle table, enums, and ref helpers.
- Prefer shared helpers from `@server/database/shared` such as `idField`, `timestamps`, and `createRef`.
- Export the table and any refs or enums needed by other modules.
- After creating the schema file, export it from `packages/server/src/database/schema/index.ts`.

```ts
import { pgEnum, pgTable, text } from 'drizzle-orm/pg-core';
import { createRef, idField, timestamps } from '@server/database/shared';

export const itemStatusEnum = pgEnum('itemStatus', ['active', 'inactive']);

export const items = pgTable('items', {
  id: idField(),
  name: text('name').notNull(),
  status: itemStatusEnum('status').default('active'),
  ...timestamps,
});

export const itemRef = createRef('item_id', () => items.id);
```

### `EntityDto.ts`

- Keep Zod schemas here.
- Reuse shared fields and enums where possible.
- Export create, update, params, query, and bulk-action schemas as needed.
- Export TypeScript input types from the schemas.

```ts
import { z } from 'zod';
import { nameField, optionalId } from '@server/shared/fields';

const itemSchema = z.object({
  id: optionalId,
  name: nameField,
});

export const createItemDto = itemSchema.omit({ id: true });
export const updateItemDto = createItemDto.partial();
export const itemIdParam = z.object({ id: z.string().min(1) });

export type CreateItemDto = z.input<typeof createItemDto>;
export type UpdateItemDto = z.input<typeof updateItemDto>;
```

### `EntityRepository.ts`

- Decorate with `@Repository()`.
- Import `DB` from `@server/database/db`.
- Use `declare db: DB;` for database access in this repo.
- Keep only persistence operations here.
- Return rows or query results. Do not shape transport messages here.

```ts
import { DB } from '@server/database/db';
import { items } from '@server/database/schema';
import { Repository } from '@server/najm';
import { eq } from 'drizzle-orm';

@Repository()
export class ItemRepository {
  declare db: DB;

  async getById(id: string) {
    const [item] = await this.db
      .select()
      .from(items)
      .where(eq(items.id, id));

    return item;
  }
}
```

### `EntityValidator.ts`

- Decorate with `@Service()`.
- Use `Err(...)` and translated messages through `@I18n(...)` or `t(...)` when possible.
- Inject repositories needed for reusable checks.
- Keep this layer about rules, not orchestration.

```ts
import { Err, I18n, Service } from '@server/najm';

@Service()
export class ItemValidator {
  @I18n('items.errors') private it!: (key: string) => string;

  constructor(private repository: ItemRepository) {}

  async ensureExists(id: string) {
    const item = await this.repository.getById(id);
    if (!item) {
      Err(404, this.it('notFound'));
    }
    return item;
  }
}
```

### `EntityService.ts`

- Decorate with `@Service()`.
- Inject repositories, validators, and supporting services here.
- Put orchestration, branching, and side effects here.
- Call validator methods before writes and destructive operations.

```ts
import { Service } from '@server/najm';

@Service()
export class ItemService {
  constructor(
    private repository: ItemRepository,
    private validator: ItemValidator,
  ) {}

  async getById(id: string) {
    return this.validator.ensureExists(id);
  }

  async create(data: CreateItemDto) {
    return this.repository.create(data);
  }
}
```

### `EntityController.ts`

- Keep transport, auth, validation, and response decorators here.
- Delegate business work to the service immediately.
- Inject the actor with `@User()` only when the service needs it.

```ts
import { Body, Controller, Get, Params, Post, ResMsg, Validate } from '@server/najm';

@Controller('/items')
export class ItemController {
  constructor(private itemService: ItemService) {}

  @Get('/:id')
  @Validate({ params: itemIdParam })
  @ResMsg('items.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.itemService.getById(id);
  }

  @Post()
  @Validate(createItemDto)
  @ResMsg('items.success.created')
  async create(@Body() body: CreateItemDto) {
    return this.itemService.create(body);
  }
}
```

### `EntityGuards.ts`

- Add this file when ownership logic or reusable auth decorators matter.
- Prefer `Policy(...)` plus `Can*()` when the resource maps well to Najm ownership scopes.
- Use custom wrappers only when policy helpers are not enough.

### `index.ts`

- Re-export the module pieces used by the app.
- Keep the barrel explicit and small.
- In this repo, schema exports usually live in `packages/server/src/database/schema/index.ts`, not the module barrel.

```ts
export { ItemRepository } from './ItemRepository';
export * from './ItemGuards';
export * from './ItemDto';
export * from './ItemValidator';
export * from './ItemService';
export * from './ItemController';
```

## Module Creation Workflow

1. Decide whether the module is full or lightweight.
2. Place it in the right domain folder under `packages/server/src/modules`.
3. Define the data model in `entitySchema.ts` if persistence is needed.
4. Export the schema from `packages/server/src/database/schema/index.ts`.
5. Define Zod schemas and exported types in `EntityDto.ts`.
6. Add `EntityGuards.ts` if ownership-aware routes or reusable auth wrappers are needed.
7. Write repository methods for raw persistence access.
8. Write validator checks for reusable domain rules.
9. Write service methods for business behavior.
10. Write controller methods with decorators, validation, and auth.
11. Export the module from its `index.ts`.
12. Export the module from the relevant parent barrel, such as `packages/server/src/modules/index.ts` or a domain sub-barrel.
13. Run lint or type-check for the touched package, and add tests if the repo has coverage for that area.

## Lightweight Module Rules

Use a smaller shape for dashboards, summaries, health, or simple actions.

- Inline tiny Zod schemas in the controller only if they are truly one-off.
- Skip `Repository`, `Validator`, and `Guards` if the feature is simple and non-persistent.
- Use simple role decorators from `@server/auth` instead of policy scaffolding when ownership is irrelevant.

## Review Checklist

- The module shape matches the problem size.
- The file names match this repo's conventions.
- The controller is thin and mostly decorators plus delegation.
- The service owns orchestration and side effects.
- Raw queries stay in the repository.
- Reusable rules live in the validator.
- Ownership or authorization helpers live in guards, not repositories.
- DTO schemas reuse shared fields and enums when possible.
- New schema exports were added to `packages/server/src/database/schema/index.ts`.
- The module barrel and any parent module barrel were updated.
- Response messages follow the existing `module.success.*` or `module.errors.*` translation style.
