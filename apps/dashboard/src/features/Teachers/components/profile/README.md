# Teacher Profile Feature

This folder contains the complete teacher profile implementation with a comprehensive multi-tab interface.

## Structure

```
profile/
├── TeacherProfile.tsx      # Main profile component with layout
├── ProfileSidebar.tsx      # Left sidebar with avatar, stats, and info
├── index.tsx              # Exports for the feature
└── tabs/                  # Individual tab components
    ├── AcademicInfoTab.tsx       # Academic qualifications and assignments
    ├── PersonalDetailsTab.tsx     # Personal and contact details
    ├── ClassesTab.tsx            # Classes taught with stats
    ├── SubjectsTab.tsx           # Subjects taught
    ├── ScheduleTab.tsx           # Teaching schedule (placeholder)
    └── DocumentsTab.tsx          # Document management (placeholder)
```

## Features

### ProfileSidebar (Left Sidebar)
- **Profile Section**: Teacher avatar, name, employee ID, and status badge
- **Role Display**: User role indicator
- **Quick Stats**:
  - Specialization
  - Qualification
  - Join date
  - Years of experience
- **Analytics Widgets**:
  - Total classes using InfoWidget
  - Total subjects using InfoWidget
  - Total students using InfoWidget

### Multi-Tab Interface (Right Main Area)

#### 1. Academic Info Tab
- Academic overview with specialization and qualification
- Years of experience and join date
- Employment ID and status
- Teaching assignments (class-subject mapping)
- Biography/professional background (if available)

#### 2. Personal Details Tab
- **Basic Information**: Name, employee ID, gender, date of birth, CIN, nationality
- **Contact Information**: Email, phone, emergency contact
- **Address Information**: Residential address
- **Employment Information**: Join date, salary, contract type

#### 3. Classes Tab
- **Real-time data fetching** from `getTeacherClassesApi`
- Statistics widgets showing:
  - Total classes
  - Active classes
  - Total students across all classes
- Classes list with:
  - Class name and description
  - Student count
  - Status badges (active, completed, cancelled)
  - Visual status indicators

#### 4. Subjects Tab
- Subjects overview with specialization
- Unique subjects extracted from assignments
- Subjects list showing:
  - Subject name
  - Number of classes where subject is taught
- Teaching assignments with class-subject mapping

#### 5. Schedule Tab (Placeholder)
- Weekly schedule placeholder
- Time table grid layout (Monday-Friday)
- Prepared structure for future schedule integration
- Coming soon message

#### 6. Documents Tab (Placeholder)
- Upload document functionality (UI ready)
- Documents list view
- Document categories:
  - Qualifications
  - Certificates
  - Other documents
- Download and view buttons (pending backend integration)

## Components Used

### From Component Library
- **NSectionHeader**: Card headers with icons and titles
- **NSectionInfo**: Information display with icons and labels
- **InfoWidget**: Statistics widgets from Dashboard
- **Card, Badge, Label, Button**: UI components from shadcn/ui
- **Tabs**: Multi-tab interface from shadcn/ui
- **NAvatar**: Avatar display component from `najm-kit`

## API Integration

The profile uses the following API endpoints:
- `getTeacherByIdApi(id)` - Get teacher details
- `getTeacherClassesApi(id)` - Get classes taught

### Data Structure
Teachers have the following structure:
```typescript
{
  id: string;
  name: string;
  employeeId?: string;
  email: string;
  phone: string;
  specialization?: string;
  qualification?: string;
  yearsOfExperience?: number;
  joinDate?: string;
  status: 'active' | 'inactive' | 'on_leave';
  salary?: number;
  contractType?: string;
  gender?: 'M' | 'F';
  dateOfBirth?: string;
  cin?: string;
  nationality?: string;
  address?: string;
  emergencyContact?: string;
  bio?: string;
  image?: string;
  assignments?: Array<{
    classId: string;
    subjectIds: string[];
  }>;
}
```

## Translations

All text is internationalized using the translation system. Profile-specific translations are in:
```
en.json -> teachers.profile.*
```

### Key Translation Keys
- `teachers.profile.quickStats`
- `teachers.profile.academicOverview`
- `teachers.profile.personalDetails`
- `teachers.profile.classesTaught`
- `teachers.profile.subjectsTaught`
- `teachers.profile.weeklySchedule`
- `teachers.profile.documents`

## Usage

### In a Page Component
```tsx
import { TeacherProfile } from '@/features/Teachers/components/profile';

export default function TeacherProfilePage() {
  const teacherId = "teacher-id-here";
  return <TeacherProfile teacherId={teacherId} />;
}
```

### Dynamic Route Example
```tsx
// app/(dashboard)/teachers/[id]/page.tsx
"use client";

import { TeacherProfile } from '@/features/Teachers/components/profile';
import { useParams } from 'next/navigation';

export default function TeacherProfilePage() {
  const params = useParams();
  const teacherId = params?.id as string;
  return <TeacherProfile teacherId={teacherId} />;
}
```

## Responsive Design

- **Desktop**: Left sidebar + main content area (12-column grid)
- **Tablet**: Sidebar collapses, full-width tabs
- **Mobile**:
  - Stacked layout
  - Compact tab labels
  - Card-based information display
  - Touch-friendly interactions

## Loading States

All tabs with API calls include:
- Loading spinner while fetching data
- Empty state messages when no data exists
- Error handling for failed requests

## Styling

- Uses Tailwind CSS for styling
- Consistent color scheme with the rest of the application
- Status-based color coding:
  - Green for active
  - Gray for inactive
  - Yellow for on_leave
- Hover effects on interactive elements
- Smooth transitions and animations

## Analytics Calculation

The profile calculates analytics from teacher assignments:
- **Total Classes**: Unique class IDs from assignments
- **Total Subjects**: Unique subject IDs from assignments
- **Total Students**: Aggregated from classes (requires API support)

## Future Enhancements

1. **Schedule Tab**:
   - Complete schedule integration with time slots
   - Calendar view for teaching periods
   - Conflict detection

2. **Documents Tab**:
   - Complete backend integration for file uploads
   - Document verification status
   - Expiry date tracking for certificates

3. **Performance Tab**:
   - Student performance metrics in teacher's classes
   - Grade distribution charts
   - Teaching effectiveness metrics

4. **Attendance Tab**:
   - Teacher's own attendance records
   - Leave history and balance

5. **Export Functionality**:
   - Export profile to PDF
   - Generate teaching reports

6. **Edit Inline**:
   - Quick edit functionality within profile
   - Real-time updates

7. **Communication Tab**:
   - Messages and announcements
   - Parent-teacher meeting schedule

## Differences from Student Profile

The teacher profile differs from student profile in:
- Focus on teaching assignments rather than academic performance
- Classes and subjects tabs show what teacher teaches (not enrolled in)
- Schedule shows teaching periods (not class attendance)
- Employment information instead of enrollment information
- No grades or fees tabs
- Emphasis on qualifications and experience

## Notes

- Assignments data structure uses `classId` and `subjectIds` arrays
- Status values: `active`, `inactive`, `on_leave`
- Salary information is displayed but can be restricted based on permissions
- Emergency contact information is separate from main contact
- Biography field supports longer text for professional background
