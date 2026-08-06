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
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library (N-prefix components)
- **Forms**: React Hook Form + Zod validation
- **State Management**: Zustand (global) + React Query (server state)
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Framework**: najm-api (custom Node.js framework)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod schemas
- **Architecture**: 4-layer pattern (Controller → Service → Repository → Validator)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn package manager

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd dashboard
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/school_db

# Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# App
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. **Set up the database**
```bash
# Generate migrations
npm run db:generate

# Push schema to database
npm run db:push
```

5. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality

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
- `npm run db:generate` - Generate database migrations from schema changes
- `npm run db:push` - Push schema changes to database
- `npm run db:drop` - Drop database tables (destructive)
- `npm run db:check` - Validate database schema consistency

## Project Structure

```
dashboard/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   └── (dashboard)/       # Dashboard pages
│   ├── features/              # Feature modules
│   │   ├── Students/          # Student management
│   │   ├── Teachers/          # Teacher management
│   │   ├── Classes/           # Class management
│   │   ├── Fees/              # Fee management
│   │   └── ...                # Other features
│   ├── components/            # Shared UI components
│   │   ├── NTable/            # Advanced data table
│   │   ├── NForm/             # Form components
│   │   ├── NInputs/           # Input components
│   │   └── ...                # Other components
│   ├── server/                # Backend code
│   │   ├── modules/           # Backend modules
│   │   │   ├── students/      # Student module
│   │   │   ├── teachers/      # Teacher module
│   │   │   └── ...            # Other modules
│   │   └── database/          # Database schema and config
│   ├── services/              # API service layer
│   ├── hooks/                 # Custom React hooks
│   ├── stores/                # Global state management
│   ├── lib/                   # Utilities and helpers
│   └── locales/               # i18n translations
├── public/                    # Static assets
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
- Check DATABASE_URL in .env file
- Ensure database exists

**Build errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Next.js cache: `rm -rf .next`

**Authentication issues:**
- Verify JWT secrets are set in .env
- Check token expiration settings

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
