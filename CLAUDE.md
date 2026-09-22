# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this School Management System repository.

## Development Commands

This is a Bun workspace monorepo. Use `bun`, never npm/yarn/pnpm — they ignore
`bun.lock` and the root `overrides` block that keeps one version of every Najm
package. Run every command from the repository root.

### Core Development
- `bun install` - One root install covers all workspaces
- `bun run dev` - Start Next.js; it compiles `@sms/server` and `@sms/contracts`
  from TypeScript source, so server, contract and catalog edits reach the
  running app without a rebuild step
- `bun run dev:https` - Same, with local HTTPS
- `bun run build` - Build the production dashboard (there is no server prebuild)
- `bun run build:all` - Compatibility alias for `build`
- `bun start` - Start production server
- `bun run lint` - ESLint over the dashboard, contracts, server, seed and `scripts/`

### Database Operations
All read `apps/dashboard/.env.local`, the monorepo's only env file.
- `bun run db:generate` - Generate database migrations from schema changes
- `bun run db:migrate` - Apply pending migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:drop` - Drop database tables (destructive)
- `bun run db:check` - Validate database schema consistency

### Testing & Quality
- Always run `bun run lint` after making code changes
- `bun run typecheck` - Typecheck contracts, server, seed and dashboard from
  source; nothing is emitted first. The dashboard runs two passes: the app
  (`tsconfig.json`, which excludes tests) and the tests (`tsconfig.test.json`,
  which adds `bun` types). Neither hides the other.
- `bun run test:config` - The focused contract, feature-config and form-fill tests
- `bun run test:access-reset` - The focused access-recovery suite
- `bun run test:boundaries` - The boundary checker's regression fixtures, then
  the checker over the real import graph (`scripts/check-workspace-boundaries.mjs`)
- `bun run test` - All selected safe tests above
- `bun run build` to verify production readiness
- `bun run i18n:check` when touching `packages/contracts/src/locales/*.json`
- `bun run check` - lint, typecheck, i18n, safe tests, build and `db:check`
  in one pass. Mutates no database.

## Framework Contracts

Single-owner boundaries. A second owner raises no error — it just produces two
states that drift — so do not add one without changing the plan first.

- **One UI provider.** `apps/dashboard/src/providers/AppProviders.tsx` mounts exactly one
  `NajmAppProvider` from `najm-next/app/client`, owning language, theme, design, time
  zone, branding, formatting, and `NTable` defaults. Never add
  `NajmDesignProvider`, `next-themes`, a second `I18nProvider`, or a local
  theme wrapper.
- **One preference source.** `apps/dashboard/src/najm.server.ts` passes School's
  policy to `createNajmNextServerApp`, which resolves cookie → signed-in user →
  School settings → typed fallback. Najm Kit owns reusable currency and time-zone
  choices; `apps/dashboard/src/najm.config.ts` owns School's default. The settings
  UI and server validator use the same shared lists.
- **One auth definition.** `apps/dashboard/src/najm.auth.ts` derives client,
  proxy, server-session, and route-handler behavior from `schoolApp.auth`.
- **One session resolution.** Server components use the module-scope adapter in
  `apps/dashboard/src/najm.server.ts`. Never call `auth.getSession()` directly
  from a layout or page, and never build the adapter per request.
- **One version of each Najm package.** Pin every workspace to the exact root
  manifest version and keep the matching root override.
- **One set of words for status and state.** Use NBadge directly. Najm Kit
  resolves common colors, icons, and labels from the status token and the
  configured catalog. Keep interface text in the shared catalogs for all
  supported languages.
- **A failed list is not an empty one.** Every `NTable` fed by a query passes
  `{...tableErrorProps(error, rows)}` from
  `apps/dashboard/src/shared/TableErrorState.tsx`, and guards its `NPageHeader`
  count with the same `hasFailedToLoad(error, rows)` so the header cannot
  contradict the table. Without it `useEntityCRUD` hands the table the `[]` it
  returns for a failed query and the screen invites the user to add their first
  record — including when the server refused the request. `rows` is what keeps a
  failed background refetch from raising an error over records already on
  screen. `NCard`-based lists have no `renderError`, so they pass `errorText`
  instead — see `Reports/components/AgingDetailTable.tsx`.

- **One declaration of every shared value.** Database enum members, API payload
  values, and the values a select may submit are declared once in
  `packages/contracts` (`@sms/contracts`) as named readonly tuples
  (`PAYMENT_METHOD_VALUES`) with their inferred types (`PaymentMethod`).
  `packages/server/src/shared/enums.ts` is a Zod adapter over them and declares
  nothing of its own; the dashboard builds `z.enum(SOMETHING_VALUES)` from the
  same tuples. The tuples module has no dependencies — not Zod, Drizzle, React,
  Najm, or server runtime — because it is consumed from TypeScript source by
  both a Bun server and a Next client bundle. The package also owns the
  translation catalog (`@sms/contracts/locales`) and the shared demo/form-fill
  generators (`@sms/contracts/fixtures`), and may depend only on the audited
  portable packages those need (`najm-i18n/define`, `@faker-js/faker`,
  `nanoid`). The by-key
  `enumValues` lookup lives at `@sms/contracts/lookup` and is server-only: it
  names all sixty-nine tuples, so importing it from a component would keep
  every domain's strings alive. Adding or removing a value changes what the
  database accepts; `packages/contracts/tests/enums.test.ts` pins the exact
  members and order of every persisted enum so a careless edit fails loudly.

- **One owner per form schema, and it is the feature.** Form schemas live in
  `features/<Feature>/config/<feature>Schemas.ts`, select options in
  `<feature>Options.ts` as pure builders taking `t`. There is no global
  validation module and no global enum hook; `apps/dashboard/src/lib` holds
  cross-cutting, domain-neutral utilities only. Field primitives, location
  shapes, and select builders stay with the feature that binds them, matching
  Kafil's self-contained feature configuration. ESLint enforces both
  boundaries: `@/lib/validations`, `@/lib/ZodEnum`, `@/lib/ENUMS` and
  `@/hooks/useEnum` are restricted imports, as are server and seed paths.

  A form schema improves UX; it is never authorization. The DTO in
  `packages/server/src/modules/**/**Dto.ts` validates the same payload again
  and is the only thing that decides what is written. A dashboard schema must
  not be imported into the server, and a transport DTO must not be bound to a
  React form.

- **A select may offer less than the API accepts, never more.** Narrowing is
  done in the feature's own config, with the reason written down and a test
  pinning it — see `FILTERABLE_PAYMENT_STATUS_VALUES` in
  `features/Financial/Payment/config/paymentOptions.ts`. Never by editing the
  shared tuple. Where a stored record can hold a value the list no longer
  offers, wrap the builder with `withStoredValue` so editing shows what is
  actually stored instead of silently rewriting it.

- **One direction for every workspace import.** Browser code (every
  `"use client"` module and everything it imports) reaches `@sms/contracts`
  only; server components and route handlers may also import `@sms/server`
  exports; the server imports contracts and never the app or seed; seed
  imports server and contracts; contracts imports no workspace package. A
  cross-package import names the package and one of its declared `exports` —
  never a relative path or alias into another package. Private workspaces
  export TypeScript source; there is no server `dist` or prebuild.
  `bun run test:boundaries` enforces this over the resolved import graph; see
  `docs/architecture/workspace.md` before adding an export or an exception.

Current Najm versions are the pins in the root `package.json`. Read them there
rather than assuming; they are upgraded deliberately, not by range.

---

# BACKEND ARCHITECTURE (packages/server/src)

## Core Architecture Pattern

This backend uses a **4-layer architecture** on the Najm framework (`najm-core` plus plugin packages):

```
Controller → Service → Repository → Validation
```

### Layer Responsibilities

**Controllers** (`*Controller.ts`):
- Handle HTTP requests/responses
- Use decorators: `@Controller`, `@Get`, `@Post`, `@Put`, `@Delete`
- Authentication guards: `@isAuth()`
- Parameter extraction: `@Body()`, `@Params()`, `@User()`
- Return standardized response format

**Services** (`*Service.ts`):
- Business logic implementation
- Dependency injection with `@Injectable()`
- Orchestrate Repository and Validator calls
- Handle complex business rules
- Cross-module operations

**Repositories** (`*Repository.ts`):
- Database operations using Drizzle ORM
- Use `@Repository()` decorator
- SQL queries and data transformations
- Analytics and aggregation queries
- Direct database access only

**Validators** (`*Validator.ts`):
- Input validation with Zod schemas
- Business rule enforcement
- Uniqueness checks
- Entity relationship validation
- Custom validation logic

## Database Schema (PostgreSQL + Drizzle)

**Core Tables & Relationships:**
```
users (1:1) → students/teachers/parents
students ← studentClasses → classes → subjects
classes ← attendance → students
classes ← assessments ← grades → students
students ← studentParents → parents
classes → teachers
announcements → users (authors)
users ← settings
users ← tokens
files → entities (students/teachers/parents)
alerts → system notifications
```

**Key Schema Features:**
- Students/Teachers/Parents use `nanoid(8)` for longer unique identifiers
- System entities (users, tokens, files, roles, alerts, settings) use `nanoid(5)`
- Comprehensive enum types for educational domain management
- Timestamp tracking on all tables (`createdAt`, `updatedAt`)
- Foreign key cascading for data integrity
- Many-to-many relationships via junction tables

**Critical Enums:**
- `user_type`: admin, teacher, student, parent
- `user_status`: active, inactive, pending
- `student_status`: active, inactive, graduated, transferred
- `teacher_status`: active, inactive, on_leave
- `class_status`: active, completed, cancelled
- `enrollment_status`: enrolled, completed, dropped, failed
- `assessment_type`: quiz, assignment, midterm, final, project, participation
- `relationship_type`: father, mother, guardian, stepparent, grandparent, other
- `alert_priority`: low, medium, high, critical
- `gender`: M, F, Other
- `language`: en, fr, ar, es

## Module Structure Pattern

Each backend module follows this structure:
```
packages/server/src/modules/[entity]/
├── index.ts              # Module exports
├── [Entity]Controller.ts # HTTP layer
├── [Entity]Service.ts    # Business logic
├── [Entity]Repository.ts # Data access
├── [Entity]Validator.ts  # Validation rules
└── types.ts             # Entity-specific types (optional)
```

## Backend Development Guidelines

### Service Layer Rules
1. **Never** put business logic in Controllers
2. Always validate inputs through Validator classes
3. Use Repository pattern for all database operations
4. Implement proper error handling with Najm error classes
5. Handle cross-module dependencies properly

### Repository Guidelines
1. Use Drizzle ORM query builder exclusively
2. Implement proper SQL joins for relationships
3. Add analytics methods for dashboard data
4. Use transactions for multi-table operations
5. Optimize queries with proper indexing considerations

### Validation Strategy
1. Zod schemas for input structure validation
2. Custom validators for business rules
3. Uniqueness checks at database level
4. Cross-entity validation in Services
5. Proper error messages with internationalization

### Authentication & Authorization
- JWT token-based authentication
- Refresh token mechanism
- Role-based access control (Admin, Teacher, Student, Parent)
- Session management with token expiry
- Password encryption and security
- User type-specific dashboard access
- Parent-student relationship validation

---

# FRONTEND ARCHITECTURE (apps/dashboard/src)

## Core Architecture Pattern

**Feature-based structure** with consistent patterns across all entities:

```
apps/dashboard/src/
├── app/                 # Next.js App Router
├── features/[Entity]/   # Feature modules
├── components/          # Shared UI components (N-prefix)
├── shared/              # Dashboard shell and cross-feature pieces
├── hooks/              # Shared custom hooks
├── services/           # API service layer
└── lib/                # auth, session, server preferences, utilities
```

Translations are not here. They live in `packages/contracts/src/locales/`
(`@sms/contracts/locales`) and serve both the backend and the frontend.

Domain values are not here either. They live in `packages/contracts`
(`@sms/contracts`) — see **One declaration of every shared value** below.

## Feature Module Structure

Each feature follows this standardized pattern:
```
features/[Entity]/
├── components/
│   ├── [Entity]Table.tsx    # Data table component
│   ├── [Entity]Form.tsx     # Create/edit form
│   └── [Entity]Card.tsx     # Mobile card view
├── hooks/
│   └── use[Entity].tsx      # Entity-specific CRUD hook
├── config/
│   ├── [entity]TableColumns.tsx     # Table column definitions
│   ├── [entity]TableConfig.tsx      # Table configuration
│   ├── [entity]Schemas.ts           # Zod form schemas + inferred value types
│   ├── [entity]Options.ts           # Typed select-option builders
│   └── [entity]Schemas.test.ts      # Defaults, refinements, option labels
```

The `config/` folder is the feature's own. Nothing outside it may declare a
schema the feature's forms bind to, and nothing inside it may be re-exported
through a catch-all barrel — a cross-feature import names its owner
(`@/features/Parents/config/parentSchemas`).

## Shared Hook Pattern: useEntityCRUD

All features use the standardized `useEntityCRUD` hook for consistent API interaction:

```typescript
// Example: useStudents.tsx
const crud = useEntityCRUD('students', {
  getAll: studentApi.getStudentsApi,
  create: studentApi.createStudentApi,
  update: studentApi.updateStudentApi,
  delete: studentApi.deleteStudentApi,
});

const {
  students,
  createStudent,
  updateStudent,
  deleteStudent,
  isStudentsLoading
} = useStudents();
```

## Component Library (N-prefix)

### NTable Component
**Advanced data tables with full feature set:**
- Sorting, filtering, pagination
- Column visibility controls
- Bulk operations support
- Responsive design with card/table toggle
- Mobile-first approach with auto-card mode
- Loading states and error handling

```tsx
<NTable
  data={students}
  columns={studentColumns}
  onEdit={handleEdit}
  onDelete={handleDelete}
  CardComponent={StudentCard}
  showViewToggle={true}
/>
```

### NForm Component
**React Hook Form + Zod integration:**
- Automatic validation with zodResolver
- Toast notifications for success/error states
- Consistent form structure across features
- TypeScript support with schema inference

```tsx
<NForm
  schema={studentValidationSchema}
  defaultValues={student}
  onSubmit={handleSubmit}
>
  <FormInput name="name" label="Student Name" />
  <FormInput name="studentCode" label="Student Number" />
  <FormInput name="gradeLevel" label="Grade Level" type="number" />
</NForm>
```

### Status Management
- `NBadge`: Generic status indicators
- `NBadge`: Entity-specific status mapping
- Color schemes match database enums
- Consistent status visualization

## State Management Architecture

### Server State (React Query)
- Caching with background updates
- Optimistic UI updates
- Error boundary handling
- Automatic refetching strategies
- Query invalidation patterns

### Client State
- Payment draft state lives in `features/Financial/Payment/store/paymentStore.ts`.
- Dialog state uses `useDialogStore()` from `najm-kit`.
- Sidebar state is owned by `NSidebarProvider` from `najm-kit`, read with `useNSidebar()`.

### Form State (React Hook Form)
- Zod validation integration
- Real-time validation feedback
- Optimized re-rendering
- TypeScript schema inference

## API Services Layer

Each entity has a dedicated API service (`*Api.ts`):
- Consistent function naming: `get[Entity]sApi`, `create[Entity]Api`
- Axios-based HTTP client with interceptors
- Error handling and response transformation
- TypeScript interfaces for requests/responses

```typescript
// studentApi.ts
export const getStudentsApi = async () => {
  const res = await api.get('/students');
  return res.data;
};

export const createStudentApi = async (data: CreateStudentData) => {
  const res = await api.post('/students', data);
  return res.data;
};
```

## Frontend Development Guidelines

### Feature Development
1. Follow the established feature-based pattern
2. Use `useEntityCRUD` for all data operations
3. Implement both table and card views for mobile
4. Add proper loading and error states
5. Maintain consistent naming conventions

### Form Guidelines
1. Always use React Hook Form + Zod validation
2. Implement proper error handling with toast notifications
3. Use TypeScript for type safety
4. Follow consistent form structure patterns
5. Add proper accessibility attributes

### Table Guidelines
1. Use `NTable` component for all data tables
2. Define columns in separate config files
3. Implement proper sorting and filtering
4. Add mobile-responsive card views
5. Handle bulk operations where needed

### Responsive Design
1. Mobile-first approach
2. Automatic card mode on mobile devices
3. Responsive navigation with sidebar collapse
4. Touch-friendly interaction patterns
5. Consistent breakpoint usage

---

# CROSS-CUTTING CONCERNS

## Internationalization
- Translation files: `packages/contracts/src/locales/[lang].json` — one catalog for backend and frontend, exported as `@sms/contracts/locales`
- Supported languages: English, French, Arabic, Spanish
- Use `t()` from `najm-i18n` for backend strings
- Frontend reads the same catalog through `NajmAppProvider`; `useTranslation` in `apps/dashboard/src/hooks/useLanguage.tsx` is a thin facade that adds a per-key English fallback
- Run `bun run i18n:check` after adding keys: every key must exist in all four locales or `NTable` and forms render raw key strings
- The catalog is consumed from source everywhere: a JSON edit reaches `bun run dev`, the server plugin and seed commands with no build step

## File Upload System
- `FileService.handleImageUpload()` for profile pictures and documents
- Entity linking to students, teachers, parents
- Cleanup on transaction failures
- Metadata storage: path, size, mimeType, category
- Support for student documents, transcripts, and certificates

## Real-time Features
- Real-time attendance tracking
- Live grade updates and notifications
- Instant messaging for announcements
- WebSocket connections for real-time updates
- Parent notifications for student activities

## Analytics & Reporting
- Dashboard widgets with educational KPIs
- Student performance analytics
- Attendance tracking and reports
- Grade distribution and trends
- Class performance metrics
- Teacher workload analytics
- Parent engagement statistics
- Chart components using Recharts library

## Common Development Patterns

### Creating New Features

**Backend Development:**
1. Define database schema with appropriate enums and relations
2. Create Repository → Service → Controller → Validator chain
3. Implement proper validation and business rules
4. Add comprehensive error handling
5. Write analytics methods for dashboards

**Frontend Development:**
1. Create feature module with standard structure
2. Build API service functions
3. Implement useEntity hook using useEntityCRUD pattern
4. Create Table, Form, and Card components
5. Add proper TypeScript types and validation schemas

### Error Handling Strategy
- **Backend**: Najm error classes with proper HTTP status codes
- **Frontend**: React Query automatic error handling + toast notifications
- **Validation**: Consistent error messages with i18n support
- **User Experience**: Graceful degradation with loading states

### Security Implementation
- JWT tokens with secure refresh mechanism
- Role-based access control (Admin, Teacher, Student, Parent)
- Input sanitization at validation layer
- File upload security with type checking
- CORS and security headers configuration
- Password hashing and secure storage

### Performance Optimization
- Database query optimization with proper indexing
- React Query caching strategies
- Lazy loading for large datasets
- Image optimization for file uploads
- Responsive design for mobile performance
- Code splitting and bundle optimization

---

# DEVELOPMENT WORKFLOW

## Code Quality Standards
1. **TypeScript**: Strict mode enabled, proper type definitions
2. **Linting**: ESLint configuration with consistent rules
3. **Formatting**: Consistent code style across frontend/backend
4. **Validation**: Zod schemas for all data structures
5. **Testing**: Component and API endpoint testing

## Best Practices Summary

### Backend Best Practices
- Keep Controllers thin, Services rich
- Use Repository pattern consistently
- Implement proper validation chains
- Handle errors gracefully with proper HTTP codes
- Use transactions for multi-table operations
- Optimize database queries
- Follow Najm framework patterns strictly

### Frontend Best Practices
- Feature-based architecture
- Consistent component patterns
- Proper state management separation
- Mobile-first responsive design
- Accessibility considerations
- Performance optimization
- Type safety with TypeScript

### Cross-Platform Considerations
- PWA support with service workers
- Responsive design for all screen sizes
- Touch-friendly interfaces
- Offline capability considerations
- Performance on mobile devices
- Cross-browser compatibility
