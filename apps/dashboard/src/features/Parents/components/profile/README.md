# Parent Profile Feature

This folder contains the complete parent profile implementation with a comprehensive multi-tab interface focused on parent information and their linked children.

## Structure

```
profile/
├── ParentProfile.tsx       # Main profile component with layout
├── ProfileSidebar.tsx      # Left sidebar with avatar, stats, and info
├── index.tsx              # Exports for the feature
└── tabs/                  # Individual tab components
    ├── PersonalDetailsTab.tsx    # Personal and contact details
    ├── ChildrenTab.tsx           # Linked children/students
    ├── FinancialTab.tsx          # Financial overview and fees
    └── DocumentsTab.tsx          # Document management (placeholder)
```

## Features

### ProfileSidebar (Left Sidebar)
- **Profile Section**: Parent avatar, name, CIN (National ID), and relationship type badge
- **Role Display**: User role indicator
- **Quick Stats**:
  - Occupation
  - Relationship type (father, mother, guardian, etc.)
  - Date of birth
  - Financial responsibility indicator
  - Emergency contact indicator
- **Analytics Widgets**:
  - Total children using InfoWidget
  - Linked active students using InfoWidget

### Multi-Tab Interface (Right Main Area)

#### 1. Personal Details Tab
- **Basic Information**: Name, CIN, gender, date of birth, relationship type, occupation
- **Contact Information**: Email, phone
- **Address Information**: Residential address
- **Additional Information**: Financial responsibility, emergency contact status

#### 2. Children Tab
- **Real-time data fetching** from `getParentChildrenApi`
- Statistics widgets showing:
  - Total children
  - Active students
  - Graduated students
- Linked children list with:
  - Student avatar, name, and student code
  - Class and section information
  - Status badges (active, inactive, graduated, transferred)
  - Visual status indicators

#### 3. Financial Tab
- **Real-time data fetching** from multiple APIs:
  - `getParentChildrenApi` - Get all children
  - `getFeesByStudentApi` - Get fees for each child
- Statistics widgets showing:
  - Total fees across all children
  - Paid fees
  - Pending fees
  - Overdue fees
- Fees organized by child:
  - Child name as section header
  - Total fees per child
  - Individual fee records with:
    - Fee type name
    - Amount
    - Due date
    - Payment status badges

#### 4. Documents Tab (Placeholder)
- Upload document functionality (UI ready)
- Documents list view
- Document categories:
  - ID Documents (CIN, passport, etc.)
  - Agreements (enrollment forms, consent forms)
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
- `getParentByIdApi(id)` - Get parent details
- `getParentChildrenApi(id)` - Get linked children/students
- `getFeesByStudentApi(studentId)` - Get fees for each child

### Data Structure
Parents have the following structure:
```typescript
{
  id: string;
  name: string;
  cin?: string;
  email: string;
  phone: string;
  relationshipType: 'father' | 'mother' | 'guardian' | 'stepparent' | 'grandparent' | 'other';
  occupation?: string;
  gender?: 'M' | 'F';
  dateOfBirth?: string;
  address?: string;
  financialResponsibility?: boolean;
  isEmergencyContact?: boolean;
  image?: string;
  // Children are fetched separately via API
}
```

### Relationship Types
The system supports multiple relationship types with color-coded badges:
- **Father**: Blue badge
- **Mother**: Pink badge
- **Guardian**: Purple badge
- **Stepparent**: Indigo badge
- **Grandparent**: Orange badge
- **Other**: Gray badge

## Translations

All text is internationalized using the translation system. Profile-specific translations are in:
```
en.json -> parents.profile.*
```

### Key Translation Keys
- `parents.profile.quickStats`
- `parents.profile.personalDetails`
- `parents.profile.linkedChildren`
- `parents.profile.feesByChild`
- `parents.profile.documents`
- `parents.relationships.*` - All relationship types

## Usage

### In a Page Component
```tsx
import { ParentProfile } from '@/features/Parents/components/profile';

export default function ParentProfilePage() {
  const parentId = "parent-id-here";
  return <ParentProfile parentId={parentId} />;
}
```

### Dynamic Route Example
```tsx
// app/(dashboard)/parents/[id]/page.tsx
"use client";

import { ParentProfile } from '@/features/Parents/components/profile';
import { useParams } from 'next/navigation';

export default function ParentProfilePage() {
  const params = useParams();
  const parentId = params?.id as string;
  return <ParentProfile parentId={parentId} />;
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
- Relationship-based color coding for badges
- Status-based color coding for children and fees
- Hover effects on interactive elements
- Smooth transitions and animations

## Analytics Calculation

The profile calculates analytics from:
- **Total Children**: Count of all linked children
- **Linked Students**: Count of active status children only
- **Financial Stats**: Aggregated from all children's fee records

## Financial Tab Features

The Financial Tab is particularly powerful:
1. Fetches all linked children
2. For each child, fetches their fee records
3. Calculates aggregate financial statistics
4. Organizes fees by child for easy tracking
5. Shows payment status with color-coded badges

This gives parents a complete financial overview of all their children's school fees in one place.

## Future Enhancements

1. **Documents Tab**:
   - Complete backend integration for file uploads
   - Document verification status
   - Expiry date tracking

2. **Communication Tab**:
   - Messages from teachers
   - School announcements
   - Parent-teacher meeting schedule

3. **Activity Feed Tab**:
   - Recent activities of all children
   - Attendance alerts
   - Grade updates
   - Fee payment reminders

4. **Calendar Tab**:
   - School events calendar
   - Children's exam schedules
   - Parent-teacher meetings
   - Holiday calendar

5. **Analytics Dashboard**:
   - Visual charts for fee payments over time
   - Children's academic progress comparison
   - Attendance trends

6. **Export Functionality**:
   - Export profile to PDF
   - Generate fee payment receipts
   - Download children's report cards

7. **Link/Unlink Students**:
   - Add functionality to link new students
   - Remove student links
   - Transfer relationships

8. **Multiple Parent Views**:
   - If both parents exist, show combined view
   - Compare responsibilities between parents

## Differences from Student/Teacher Profiles

The parent profile differs in:
- Focus on **linked children** rather than personal academics
- **Financial overview** across multiple students
- **Relationship type** emphasis (father, mother, guardian, etc.)
- **Financial responsibility** and emergency contact indicators
- No grades, attendance, or class information for the parent themselves
- Aggregated data from all linked children

## Notes

- Parents can be linked to multiple students
- Financial responsibility flag indicates who pays fees
- Emergency contact flag indicates who can be contacted in emergencies
- Relationship types are color-coded for easy identification
- CIN (National ID) is used as a unique identifier
- The profile automatically fetches and aggregates data from all linked children
- Financial calculations happen client-side for real-time updates

## Security Considerations

- Ensure proper authorization checks (parents should only see their own profile)
- Sensitive financial information should be protected
- CIN and contact information should be handled securely
- Link/unlink operations should require proper permissions
