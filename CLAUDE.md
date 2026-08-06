# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this School Management System repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbopack (Next.js dev mode)
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality

### Database Operations
- `npm run db:generate` - Generate database migrations from schema changes
- `npm run db:push` - Push schema changes to database
- `npm run db:drop` - Drop database tables (destructive)
- `npm run db:check` - Validate database schema consistency

### Testing & Quality
- Always run `npm run lint` after making code changes
- Use `npm run build` to verify production readiness

---

# BACKEND ARCHITECTURE (src/server)

## Core Architecture Pattern

This backend uses a **4-layer architecture** with the najm-api framework:

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
src/server/modules/[entity]/
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
4. Implement proper error handling with najm-api patterns
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

# FRONTEND ARCHITECTURE (src/)

## Core Architecture Pattern

**Feature-based structure** with consistent patterns across all entities:

```
src/
├── app/                 # Next.js App Router
├── features/[Entity]/   # Feature modules
├── components/          # Shared UI components (N-prefix)
├── hooks/              # Shared custom hooks
├── services/           # API service layer
├── stores/             # Global state management
├── lib/                # Utilities and configurations
└── locales/            # Internationalization
```

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
│   └── [entity]ValidateSchema.ts    # Zod validation schemas
```

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

### Global State (Zustand)
- `AuthStore`: User authentication state
- `DialogStore`: Modal and dialog management
- `SidebarStore`: UI state management
- `MultiStepFormStore`: Complex form workflows

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
- Translation files: `src/locales/[lang].json`
- Supported languages: English, French, Arabic, Spanish
- Use `t()` function from najm-api for backend strings
- Frontend translations through Next.js i18n

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
- **Backend**: najm-api error classes with proper HTTP status codes
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
- Follow najm-api patterns strictly

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