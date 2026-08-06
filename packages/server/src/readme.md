REQUEST: PATCH /students/42
User: Teacher ID #15
Action: update:students

STEP 1: Extract Request Context
├─ UserID: 15
├─ Role: teacher
├─ Action: update:students
└─ ResourceID: student#42

STEP 2: Check Role Permission
├─ Query: Does 'teacher' role have 'update:students'?
└─ Result: ✅ YES

STEP 3: Check owner Relationship
├─ Query: Get classes taught by Teacher#15
├─ Query: Get classes where Student#42 is enrolled
├─ Check: Is there an intersection?
└─ Result: ✅ YES (both in Class#5)

STEP 4: Decision
└─ ✅ ALLOW - Teacher can update this student

REQUEST: GET /students/42/grades
User: Parent ID #5

1️⃣ AUTHENTICATION GUARD
   └─ Validates JWT, extracts user info
   └─ Adds user to request object

2️⃣ PERMISSION GUARD
   └─ Checks: Does 'parent' role have 'read:grades'?
   └─ Result: ✅ YES

3️⃣ RELATIONSHIP GUARD
   └─ Calls: StudentPolicy.canReadGrades(5, 'parent', 42)
   └─ StudentPolicy internally calls:
      └─ RelationshipService.isParentOf(5, 42)
      └─ Queries database: relationships table
   └─ Result: ✅ YES (Parent#5 is parent of Student#42)

4️⃣ CONTROLLER METHOD EXECUTES
   └─ StudentController.getGrades(42)
   └─ Returns student grades

RESPONSE: ✅ 200 OK with grades


 ---
  In Your Student Management System

  What to Log:

  Authentication Events:
  // Login attempt
  "2025-01-15 10:30:45 - User 'teacher@school.com' logged in from IP 192.168.1.100"

  // Failed login
  "2025-01-15 10:31:12 - Failed login attempt for 'admin@school.com' from IP 203.0.113.45"

  // Permission denied
  "2025-01-15 10:32:00 - User 'parent@email.com' (role: parent) attempted to access admin endpoint      
  /students/delete"

  Data Access:
  // Student data viewed
  "2025-01-15 10:35:00 - Teacher 'John Doe' (TCH001) viewed student 'Alice Smith' (STU123) grades"      

  // Bulk data export
  "2025-01-15 11:00:00 - Admin 'Jane Admin' exported 150 student records"

  // Unauthorized attempt
  "2025-01-15 11:05:00 - Parent 'Bob Parent' (PAR045) attempted to view student 'Charlie Brown'         
  (STU789) - ACCESS DENIED (not their child)"

  Data Modifications:
  // Student created
  "2025-01-15 14:00:00 - Admin 'Jane Admin' created student 'New Student' (STU456)"

  // Grade changed
  "2025-01-15 14:30:00 - Teacher 'John Doe' updated grade for student 'Alice Smith' (STU123) - Math     
  Test: 85 → 90"

  // Student deleted
  "2025-01-15 15:00:00 - Admin 'Jane Admin' deleted student 'Old Student' (STU999)"

  ---
  Implementation Example for Your System

  Basic Audit Logger

  // src/server/shared/utils/AuditLogger.ts

  import { db } from '@/server/database/db';
  import { auditLogs } from '@/server/database/schema';

  export class AuditLogger {

    static async log(data: {
      userId: string;
      userRole: string;
      action: string;
      resource: string;
      resourceId?: string;
      status: 'success' | 'denied' | 'error';
      ipAddress?: string;
      metadata?: any;
    }) {
      try {
        await db.insert(auditLogs).values({
          ...data,
          timestamp: new Date(),
          metadata: data.metadata ? JSON.stringify(data.metadata) : null
        });
      } catch (error) {
        console.error('Failed to write audit log:', error);
        // Never let audit logging break the app
      }
    }

    // Convenience methods
    static async logAccess(user: any, resource: string, resourceId: string, granted: boolean) {
      return this.log({
        userId: user.id,
        userRole: user.role,
        action: 'read',
        resource,
        resourceId,
        status: granted ? 'success' : 'denied',
        ipAddress: user.ipAddress
      });
    }

    static async logModification(user: any, action: string, resource: string, resourceId: string,       
  changes?: any) {
      return this.log({
        userId: user.id,
        userRole: user.role,
        action,
        resource,
        resourceId,
        status: 'success',
        metadata: changes
      });
    }
  }

  ---
  Database Schema for Audit Logs

  // src/server/database/schema/auditLogs.ts

  export const auditLogs = pgTable('audit_logs', {
    id: text('id').primaryKey().$defaultFn(() => nanoid(10)),
    userId: text('user_id').notNull().references(() => users.id),
    userRole: text('user_role').notNull(),
    action: text('action').notNull(), // 'create', 'read', 'update', 'delete'
    resource: text('resource').notNull(), // 'students', 'grades', 'attendance'
    resourceId: text('resource_id'),
    status: text('status').notNull(), // 'success', 'denied', 'error'
    ipAddress: text('ip_address'),
    metadata: jsonb('metadata'), // Additional context
    timestamp: timestamp('timestamp').notNull().defaultNow(),
  });

  ---
  Using Audit Logging in Guards

  // In StudentGuards.ts

  import { AuditLogger } from '@/server/shared/utils/AuditLogger';

  async checkAccess(@User() user, @Params('id') studentId) {
    const hasAccess = await this.determineAccess(user, studentId);

    // Log the access attempt
    await AuditLogger.logAccess(user, 'students', studentId, hasAccess);

    return hasAccess;
  }

  async canAccessAll(@User() user, @Ctx() ctx) {
    const filter = await this.getAccessibleIds(user);

    // Log warning if user has permission but no data
    if (filter !== 'All' && (!filter || filter.length === 0)) {
      await AuditLogger.log({
        userId: user.id,
        userRole: user.role,
        action: 'list',
        resource: 'students',
        status: 'success',
        metadata: { warning: 'User has permission but no accessible students' }
      });
    }

    ctx.set('filter', filter);
    return true;
  }

  ---
  Using Audit Logging in Service Layer

  // In StudentService.ts

  async create(data) {
    const newStudent = await this.studentRepository.create(data);

    // Log student creation
    await AuditLogger.logModification(
      this.currentUser, // Inject user from context
      'create',
      'students',
      newStudent.id,
      { studentCode: newStudent.studentCode, name: newStudent.name }
    );

    return newStudent;
  }

  async update(id, data) {
    const oldStudent = await this.studentRepository.getById(id);
    const updatedStudent = await this.studentRepository.update(id, data);

    // Log changes
    await AuditLogger.logModification(
      this.currentUser,
      'update',
      'students',
      id,
      {
        before: { name: oldStudent.name, status: oldStudent.status },
        after: { name: updatedStudent.name, status: updatedStudent.status }
      }
    );

    return updatedStudent;
  }

  ---
  Benefits of Audit Logging

  Security:

  - Detect unauthorized access attempts
  - Track suspicious patterns (e.g., mass data exports)
  - Investigate security incidents

  Compliance:

  - GDPR: Track who accessed personal data
  - FERPA: School records access logging
  - SOC2: Security audit trail

  Debugging:

  - Understand user behavior
  - Reproduce bugs by seeing exact user actions
  - Track down data inconsistencies

  Accountability:

  - Prove who changed what
  - Settle disputes (e.g., "I never changed that grade!")
  - Management oversight

  ---
  Simple Console Audit Log (For Now)

  If you don't want a full database solution yet:

  // In StudentGuards.ts

  async canAccessAll(@User() user, @Ctx() ctx) {
    const filter = await this.getAccessibleIds(user);

    // Simple console audit log
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: user.id,
      userRole: user.role,
      action: 'list_students',
      filter: filter === 'ALL' ? 'all' : `${filter.length} students`,
      warning: filter !== 'All' && filter.length === 0 ? 'No accessible students' : null
    }));

    ctx.set('filter', filter);
    return true;
  }

  Output:
  {"timestamp":"2025-01-15T10:30:00.000Z","userId":"USR123","userRole":"teacher","action":"list_stud    
  ents","filter":"25 students","warning":null}
  {"timestamp":"2025-01-15T10:31:00.000Z","userId":"USR456","userRole":"parent","action":"list_stude    
  nts","filter":"2 students","warning":null}
  {"timestamp":"2025-01-15T10:32:00.000Z","userId":"USR789","userRole":"teacher","action":"list_stud    
  ents","filter":"0 students","warning":"No accessible students"}

  ---
  Industry Standard Tools

  For production systems, use specialized tools:
  - Winston/Pino - Structured logging libraries
  - Elasticsearch + Kibana - Log aggregation and visualization
  - Datadog/New Relic - Application monitoring
  - AWS CloudWatch - Cloud logging
  - Splunk - Enterprise log management

  ---
  Would you like me to implement a basic audit logging system for your student management system?       
