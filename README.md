# Student Management System

A comprehensive, modern school management system built with Next.js and TypeScript, designed to streamline educational administration, student tracking, and parent-teacher communication.

## Features

### Core Modules
- **Student Management**: Complete student profiles, enrollment tracking, and academic history
- **Teacher Management**: Staff profiles, subject assignments, and workload tracking
- **Parent Portal**: Parent accounts with student relationship management
- **Class Management**: Class creation, scheduling, and student enrollment
- **Attendance Tracking**: Real-time attendance monitoring for students and teachers
- **Grade Management**: Comprehensive assessment and grading system
- **Fee Management**: Tuition tracking, payment processing, and fee type configuration
- **Transport Management**: Vehicle and driver management with route tracking
- **Expense Tracking**: School expense monitoring and financial reporting
- **Announcements & Events**: School-wide communication and event calendar

### Advanced Features
- **Dashboard Analytics**: Real-time KPIs and performance metrics
- **Role-Based Access Control**: Admin, Teacher, Student, and Parent roles
- **Multi-language Support**: English, French, Arabic, and Spanish
- **Mobile-Responsive Design**: Optimized for all devices with PWA support
- **Real-time Notifications**: Live updates for grades, attendance, and announcements
- **File Upload System**: Document management for students and staff
- **Advanced Reporting**: Performance analytics and trend visualization

## Tech Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: `najm-kit`, wrapped by School's N-prefix components
- **Providers**: one `NajmAppProvider` from `najm-kit/app`
- **Forms**: React Hook Form + Zod validation
- **State Management**: Zustand (global) + React Query (server state)
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Framework**: Najm (`najm-core` + plugin packages)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod schemas
- **Architecture**: 4-layer pattern (Controller → Service → Repository → Validator)

## Prerequisites

- Bun 1.3+ — the package manager and test runner for this monorepo. Do not use
  npm, yarn, or pnpm: they ignore `bun.lock` and the `overrides` block that
  pins one version of every Najm package.
- PostgreSQL 14+
- Redis 7+ for production; local development may use the in-memory fallback

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd school
```

2. **Install dependencies**

One install at the repository root covers every workspace.
```bash
bun install
```

3. **Configure environment variables**

Copy the tracked template and fill in real values:
```bash
cp apps/dashboard/.env.local.example apps/dashboard/.env.local
```

`apps/dashboard/.env.local` is the whole monorepo's environment file. Next.js
loads it for the dashboard, and every `db:*` and `seed:*` script passes it
explicitly with `--env-file`. There is no root `.env`.

Four values are required and abort startup when missing:

| Variable | Why |
| --- | --- |
| `DB_URL` | Postgres connection string. Drizzle's config requires this exact name; `DATABASE_URL` is only a runtime fallback. |
| `JWT_ACCESS_SECRET` | Read by `najm-auth`, not by School's `authConfig()`. Missing throws `Plugin "auth" requires configuration`. |
| `JWT_REFRESH_SECRET` | Same, for the refresh family. Use a different value from the access secret. |
| `NAJM_ENCRYPTION_KEY` | 32 bytes, base64 or hex. Rotating it invalidates everything encrypted with the previous key. |

Production additionally requires an authenticated `REDIS_URL`. Najm stores
rate-limit counters there, verifies Redis during startup, and refuses to fall
back to per-process memory. `/api/health/status` reports only database/cache
availability and returns `503` when either dependency is unavailable. The
Compose Redis service is internal-only and persists counters with AOF.

The template documents the optional values, including `NAJM_SESSION_SECRET`
and `NAJM_AUTH_INTERNAL_URL` for server-side session recovery. Never commit
`.env.local`; only the `.example` template is tracked.

4. **Set up the database**
```bash
# Generate migrations from schema changes
bun run db:generate

# Apply pending migrations
bun run db:migrate
```

5. **Create the first administrator**
```bash
bun run seed:admin
```

6. **Start development server**
```bash
bun run dev
```

The application will be available at `http://localhost:3000`

## Development Commands

### Core Development
- `bun run dev` - Start development server with Turbopack
- `bun run build` - Build the dashboard
- `bun run build:all` - Build server, seed, and dashboard
- `bun start` - Start production server
- `bun run lint` - Run ESLint for code quality

### Tests
- `bun run test:server` - Backend module tests
- `bun run test:dashboard` - Dashboard unit and contract tests, including the
  Najm dependency-resolution guard
- `bun run test:seed` - Seed data faker tests

### Runtime Business Date For Testing

The server supports an optional `APP_BUSINESS_DATE=YYYY-MM-DD` override. This lets you test enrollment, billing, installments, transport assignments, and date-based dashboards as if the server were running on that date. It does not change audit timestamps, which continue to use the real clock.

The value is server-only and is read when the process starts, so restart the server after changing it. Do not prefix it with `NEXT_PUBLIC_`; those values can be embedded during a Next.js build.

PowerShell development example:

```powershell
$env:APP_BUSINESS_DATE = '2026-06-15'
bun run dev
```

PowerShell production-build example. The override is set at `start` time, so the same build can be tested with different dates:

```powershell
bun run build:all
$env:APP_BUSINESS_DATE = '2026-06-15'
bun run start
```

Bash equivalents:

```bash
APP_BUSINESS_DATE=2026-06-15 bun run dev
APP_BUSINESS_DATE=2026-06-15 bun run start
```

To return to the real system date in PowerShell:

```powershell
Remove-Item Env:APP_BUSINESS_DATE
```

Leave the academic settings at September through June. July remains available for collecting late payments, but new enrollment and billable assignments should use a business date inside the academic period.

### Database Operations
- `bun run db:generate` - Generate database migrations from schema changes
- `bun run db:migrate` - Apply pending migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:drop` - Drop database tables (destructive)
- `bun run db:check` - Validate database schema consistency

### Najm Upgrade Acceptance

- `bun run test:e2e:najm-upgrade` - Run the production-build auth, provider,
  preference, responsive, RTL, and role acceptance suite. It requires an
  isolated migrated database and runs automatically in GitHub with pgvector.

## Project Structure

A Bun workspace monorepo. The backend is its own package, not a folder inside
the Next.js app.

```
school/
├── apps/
│   ├── dashboard/             # Next.js app
│   │   ├── src/app/           # App Router
│   │   │   ├── (auth)/        # Authentication pages
│   │   │   ├── (dashboard)/   # Dashboard pages
│   │   │   └── api/           # Catch-all Najm handler + preference endpoints
│   │   ├── src/features/      # Feature modules (Students, Teachers, …)
│   │   ├── src/components/    # Shared UI wrappers over najm-kit
│   │   ├── src/preferences/   # Typed language/theme/time-zone/currency allowlists
│   │   ├── src/services/      # API service layer
│   │   ├── src/hooks/         # Custom React hooks
│   │   ├── src/shared/        # Dashboard shell and cross-feature pieces
│   │   ├── src/stores/        # Zustand stores
│   │   └── src/lib/           # auth, session, server preferences, utilities
├── packages/
│   ├── server/                # Najm backend
│   │   ├── src/modules/       # Controller → Service → Repository → Validator
│   │   ├── src/database/      # Drizzle schema and migrations
│   │   └── src/locales/       # Source of truth for en/fr/ar/es translations
│   └── seed/                  # Seed and demo-data scripts
└── ...config files
```

## Architecture

### Backend Architecture

**4-Layer Pattern:**
```
Controller → Service → Repository → Validator
```

- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic implementation
- **Repositories**: Database operations (Drizzle ORM)
- **Validators**: Input validation and business rules

### Frontend Architecture

**Feature-Based Structure:**
- Each feature module contains components, hooks, and configurations
- Shared component library with N-prefix naming convention
- Consistent patterns across all entities using `useEntityCRUD` hook

### Framework Contracts

These four boundaries are single-owner. Adding a second owner produces no
error — just two states that drift apart — so change them deliberately.

**One UI provider.** `apps/dashboard/src/app/providers.tsx` mounts exactly one
`NajmAppProvider`, which owns language, theme, design, time zone, branding,
formatting, and `NTable` defaults. Do not mount `NajmDesignProvider`,
`next-themes`, a second `I18nProvider`, or a local theme wrapper. Auth and
React Query stay above it because they are app-owned.

**One preference source.** Server-rendered defaults come from
`apps/dashboard/src/lib/serverPreferences.ts`, which resolves cookie → signed-in
user → School settings → typed fallback. New preferences belong in
`apps/dashboard/src/preferences/`, not inline in a component.

**One session resolution.** Server components read the session through the
`serverAuth` singleton in `apps/dashboard/src/lib/session.ts`. Do not call
`auth.getSession()` directly in a layout or page, and do not construct the
adapter per request — that re-resolves the session and can cross requests.

**One version of each Najm package.** Versions are pinned exactly in every
workspace manifest and deduped by the root `overrides` block.
`bun run test:dashboard` fails when a second copy resolves, including a stale
nested directory that `bun install` left behind.

## Key Features Explained

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Teacher, Student, Parent)
- Secure session management
- Password encryption

### Data Tables (NTable)
- Advanced sorting and filtering
- Column visibility controls
- Responsive design with automatic card/table toggle
- Bulk operations support
- Mobile-first approach

### Form System (NForm)
- React Hook Form integration
- Zod validation schemas
- Automatic error handling
- Toast notifications
- TypeScript type safety

### State Management
- **Server State**: React Query for API data caching
- **Global State**: Zustand for UI and auth state
- **Form State**: React Hook Form for form handling

## User Roles

1. **Admin**: Full system access, user management, system configuration
2. **Teacher**: Class management, grading, attendance tracking
3. **Student**: View grades, attendance, assignments, announcements
4. **Parent**: Monitor children's academic progress and attendance

## Default Credentials

After initial setup, use these credentials to log in:
- **Admin**: (will be created during seed process)

## Database Schema

### Core Entities
- Users (Admin, Teachers, Students, Parents)
- Classes and Sections
- Subjects and Assessments
- Attendance Records
- Grades and Evaluations
- Fee Types and Payments
- Vehicles and Drivers
- Announcements and Events
- Files and Documents

### Key Relationships
- Students belong to Classes
- Classes have Teachers and Subjects
- Parents are linked to Students
- Attendance tracked per Class
- Grades linked to Assessments

## API Documentation

API endpoints follow RESTful conventions:

```
GET    /api/students          # Get all students
GET    /api/students/:id      # Get student by ID
POST   /api/students          # Create student
PUT    /api/students/:id      # Update student
DELETE /api/students/:id      # Delete student
```

Similar patterns apply to all entities (teachers, classes, fees, etc.)

## Internationalization

Supported languages:
- English (en)
- French (fr)
- Arabic (ar)
- Spanish (es)

Translation files located in `src/locales/`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use ESLint for code quality
- Maintain consistent naming conventions
- Add proper error handling
- Write meaningful commit messages

## Security

- Password hashing with secure algorithms
- JWT token-based authentication
- Input validation and sanitization
- Role-based access control
- Secure file upload handling
- CORS configuration

## Performance Optimization

- React Query caching strategies
- Lazy loading for large datasets
- Image optimization
- Code splitting and bundle optimization
- Database query optimization with proper indexing
- Mobile performance considerations

## Troubleshooting

### Common Issues

**Database connection errors:**
- Verify PostgreSQL is running
- Check `DB_URL` in `apps/dashboard/.env.local`
- Ensure database exists

**Build errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && bun install`
- Clear Next.js cache: `rm -rf apps/dashboard/.next`

**`Plugin "auth" requires configuration: JWT_ACCESS_SECRET` during build:**
- The build collects page data, which starts the Najm server. Set
  `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `NAJM_ENCRYPTION_KEY` in
  `apps/dashboard/.env.local`.

**Duplicate `najm-kit` styling or a sidebar that will not open:**
- Two resolved copies of a Najm package mean two React contexts. Run
  `bun run test:dashboard`; the resolution guard names the offending path.
  Delete the nested directory and re-run `bun install` to confirm it is not
  recreated.

**Authentication issues:**
- Verify the JWT secrets are set in `apps/dashboard/.env.local`
- Check `ACCESS_EXPIRES_IN` / `REFRESH_EXPIRES_IN`

## License

[Add your license information here]

## Support

For support, please contact [your-email@example.com] or open an issue in the repository.

## Acknowledgments

- Built with Next.js and TypeScript
- UI components inspired by shadcn/ui
- Backend powered by najm-api framework

---

**Version**: 1.0.0
**Last Updated**: 2025
