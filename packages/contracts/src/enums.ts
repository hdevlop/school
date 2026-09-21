/**
 * Shared domain values.
 *
 * These are the strings that travel: database enum members, API payload
 * values, and the values a dashboard select is allowed to submit. They are
 * declared once here so the server and the dashboard cannot drift apart by
 * editing one copy.
 *
 * This module is deliberately dependency-free — no Zod, no Drizzle, no React,
 * no translations, no server runtime. That is what makes it safe to pull into
 * a browser bundle as well as a Bun server build. Zod adapters live beside the
 * server enums; labels and translation keys live with the feature that renders
 * them.
 *
 * Adding or removing a value here changes what the database and the API will
 * accept. Renaming one is a data migration, not an edit.
 */

export const USER_TYPE_VALUES = ['admin', 'teacher', 'student', 'parent'] as const;
export type UserType = (typeof USER_TYPE_VALUES)[number];

export const USER_STATUS_VALUES = ['active', 'inactive', 'pending'] as const;
export type UserStatus = (typeof USER_STATUS_VALUES)[number];

export const TOKEN_STATUS_VALUES = ['active', 'revoked', 'expired'] as const;
export type TokenStatus = (typeof TOKEN_STATUS_VALUES)[number];

export const TOKEN_TYPE_VALUES = ['access', 'refresh'] as const;
export type TokenType = (typeof TOKEN_TYPE_VALUES)[number];

export const FILE_STATUS_VALUES = ['active', 'deleted', 'archived'] as const;
export type FileStatus = (typeof FILE_STATUS_VALUES)[number];

export const GENDER_VALUES = ['M', 'F'] as const;
export type Gender = (typeof GENDER_VALUES)[number];

export const STUDENT_STATUS_VALUES = ['active', 'inactive', 'graduated', 'transferred'] as const;
export type StudentStatus = (typeof STUDENT_STATUS_VALUES)[number];

export const TEACHER_STATUS_VALUES = ['active', 'inactive', 'onLeave'] as const;
export type TeacherStatus = (typeof TEACHER_STATUS_VALUES)[number];

export const EMPLOYMENT_TYPE_VALUES = ['fullTime', 'partTime', 'contract', 'temporary'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPE_VALUES)[number];

export const RELATIONSHIP_TYPE_VALUES = [
  'father',
  'mother',
  'guardian',
  'stepparent',
  'grandparent',
  'other',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPE_VALUES)[number];

export const SEMESTER_VALUES = ['spring', 'summer', 'fall', 'winter'] as const;
export type Semester = (typeof SEMESTER_VALUES)[number];

export const CLASS_STATUS_VALUES = ['active', 'completed', 'cancelled'] as const;
export type ClassStatus = (typeof CLASS_STATUS_VALUES)[number];

export const SECTION_STATUS_VALUES = ['active', 'inactive', 'archived'] as const;
export type SectionStatus = (typeof SECTION_STATUS_VALUES)[number];

export const LANGUAGE_VALUES = ['en', 'fr', 'ar', 'es'] as const;
export type Language = (typeof LANGUAGE_VALUES)[number];

export const ENROLLMENT_STATUS_VALUES = ['enrolled', 'completed', 'dropped', 'failed'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUS_VALUES)[number];

export const ASSIGNMENT_STATUS_VALUES = ['active', 'completed', 'cancelled'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUS_VALUES)[number];

export const CALENDAR_SYSTEM_VALUES = ['SEMESTER', 'TRIMESTER', 'QUARTER'] as const;
export type CalendarSystem = (typeof CALENDAR_SYSTEM_VALUES)[number];

export const ASSESSMENT_TYPE_VALUES = [
  'quiz',
  'assignment',
  'project',
  'participation',
  'test',
  'presentation',
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPE_VALUES)[number];

export const ASSESSMENT_STATUS_VALUES = ['scheduled', 'active', 'completed', 'cancelled'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUS_VALUES)[number];

export const SUBMISSION_TYPE_VALUES = ['online', 'paper', 'presentation', 'practical', 'discussion'] as const;
export type SubmissionType = (typeof SUBMISSION_TYPE_VALUES)[number];

export const EXAM_TYPE_VALUES = ['midterm', 'final', 'standardized'] as const;
export type ExamType = (typeof EXAM_TYPE_VALUES)[number];

export const EXAM_SECURITY_VALUES = ['low', 'medium', 'high'] as const;
export type ExamSecurity = (typeof EXAM_SECURITY_VALUES)[number];

export const EXAM_STATUS_VALUES = ['scheduled', 'active', 'completed', 'cancelled', 'rescheduled'] as const;
export type ExamStatus = (typeof EXAM_STATUS_VALUES)[number];

export const GRADE_STATUS_VALUES = ['pending', 'graded', 'missed'] as const;
export type GradeStatus = (typeof GRADE_STATUS_VALUES)[number];

export const ATTENDANCE_STATUS_VALUES = ['present', 'absent', 'late'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS_VALUES)[number];

export const ATTENDANCE_TYPE_VALUES = ['student', 'staff'] as const;
export type AttendanceType = (typeof ATTENDANCE_TYPE_VALUES)[number];

export const PROFICIENCY_LEVEL_VALUES = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type ProficiencyLevel = (typeof PROFICIENCY_LEVEL_VALUES)[number];

export const DAY_OF_WEEK_VALUES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
export type DayOfWeek = (typeof DAY_OF_WEEK_VALUES)[number];

export const ALERT_TYPE_VALUES = [
  'academic',
  'attendance',
  'behavioral',
  'health',
  'system',
  'announcement',
  'reminder',
  'emergency',
] as const;
export type AlertType = (typeof ALERT_TYPE_VALUES)[number];

export const ALERT_PRIORITY_VALUES = ['low', 'medium', 'high', 'critical'] as const;
export type AlertPriority = (typeof ALERT_PRIORITY_VALUES)[number];

export const ALERT_STATUS_VALUES = ['active', 'acknowledged', 'resolved', 'dismissed'] as const;
export type AlertStatus = (typeof ALERT_STATUS_VALUES)[number];

export const BEHAVIOR_REWARD_CATEGORY_VALUES = [
  'academic_effort',
  'improvement',
  'respect',
  'helpfulness',
  'leadership',
  'teamwork',
  'responsibility',
  'community_service',
  'excellent_attendance',
  'other',
] as const;
export type BehaviorRewardCategory = (typeof BEHAVIOR_REWARD_CATEGORY_VALUES)[number];

export const BEHAVIOR_RECOGNITION_LEVEL_VALUES = ['appreciation', 'achievement', 'excellence'] as const;
export type BehaviorRecognitionLevel = (typeof BEHAVIOR_RECOGNITION_LEVEL_VALUES)[number];

export const BEHAVIOR_REWARD_TYPE_VALUES = [
  'verbal_praise',
  'written_praise',
  'merit',
  'badge',
  'certificate',
  'privilege',
  'prize',
  'other',
] as const;
export type BehaviorRewardType = (typeof BEHAVIOR_REWARD_TYPE_VALUES)[number];

export const DISCIPLINE_CATEGORY_VALUES = [
  'classroom_disruption',
  'disrespect',
  'bullying',
  'fighting',
  'cheating',
  'vandalism',
  'uniform_violation',
  'device_misuse',
  'prohibited_item',
  'other',
] as const;
export type DisciplineCategory = (typeof DISCIPLINE_CATEGORY_VALUES)[number];

export const DISCIPLINE_SEVERITY_VALUES = ['low', 'medium', 'high', 'critical'] as const;
export type DisciplineSeverity = (typeof DISCIPLINE_SEVERITY_VALUES)[number];

export const DISCIPLINE_STATUS_VALUES = ['open', 'resolved'] as const;
export type DisciplineStatus = (typeof DISCIPLINE_STATUS_VALUES)[number];

export const DISCIPLINE_ACTION_VALUES = [
  'verbal_warning',
  'written_warning',
  'detention',
  'counseling',
  'parent_meeting',
  'suspension',
  'other',
] as const;
export type DisciplineAction = (typeof DISCIPLINE_ACTION_VALUES)[number];

export const FEE_TYPE_STATUS_VALUES = ['active', 'inactive', 'archived'] as const;
export type FeeTypeStatus = (typeof FEE_TYPE_STATUS_VALUES)[number];

export const FEE_CATEGORY_VALUES = [
  'tuition',
  'registration',
  'transport',
  'cafeteria',
  'books',
  'sports',
  'uniform',
  'technology',
  'fieldtrip',
  'other',
] as const;
export type FeeCategory = (typeof FEE_CATEGORY_VALUES)[number];

export const PAYMENT_TYPE_VALUES = ['recurring', 'oneTime'] as const;
export type PaymentType = (typeof PAYMENT_TYPE_VALUES)[number];

export const SCHEDULE_VALUES = ['monthly', 'quarterly', 'semester', 'annually', 'oneTime'] as const;
export type Schedule = (typeof SCHEDULE_VALUES)[number];

export const FEE_STATUS_VALUES = ['pending', 'partiallyPaid', 'paid', 'overdue'] as const;
export type FeeStatus = (typeof FEE_STATUS_VALUES)[number];

export const FEE_INSTALLMENT_STATUS_VALUES = [
  'pending',
  'partiallyPaid',
  'paid',
  'overdue',
  'cancelled',
] as const;
export type FeeInstallmentStatus = (typeof FEE_INSTALLMENT_STATUS_VALUES)[number];

export const PAYMENT_METHOD_VALUES = [
  'cash',
  'bankTransfer',
  'check',
  'creditCard',
  'debitCard',
  'online',
  'mobilePayment',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];

export const PAYMENT_STATUS_VALUES = [
  'completed',
  'pending',
  'deposited',
  'bounced',
  'failed',
  'refunded',
  'voided',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

export const EVENT_TYPE_VALUES = [
  'academic',
  'sports',
  'cultural',
  'holiday',
  'exam',
  'meeting',
  'workshop',
  'fieldtrip',
  'ceremony',
  'conference',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPE_VALUES)[number];

export const EVENT_STATUS_VALUES = ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'] as const;
export type EventStatus = (typeof EVENT_STATUS_VALUES)[number];

export const EVENT_VISIBILITY_VALUES = [
  'public',
  'private',
  'teachers',
  'students',
  'parents',
  'staff',
] as const;
export type EventVisibility = (typeof EVENT_VISIBILITY_VALUES)[number];

export const PARTICIPANT_TYPE_VALUES = ['student', 'teacher', 'parent', 'staff'] as const;
export type ParticipantType = (typeof PARTICIPANT_TYPE_VALUES)[number];

export const EXPENSE_CATEGORY_VALUES = [
  'utilities',
  'maintenance',
  'supplies',
  'equipment',
  'transport',
  'food',
  'security',
  'cleaning',
  'insurance',
  'rent',
  'tax',
  'marketing',
  'training',
  'technology',
  'miscellaneous',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORY_VALUES)[number];

export const EXPENSE_STATUS_VALUES = ['pending', 'approved', 'paid', 'rejected', 'cancelled'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUS_VALUES)[number];

export const PAYSLIP_STATUS_VALUES = ['pending', 'paid', 'cancelled'] as const;
export type PayslipStatus = (typeof PAYSLIP_STATUS_VALUES)[number];

export const TRACKER_MODE_VALUES = [
  'tracking',
  'gprs',
  'sms',
  'sleepTime',
  'sleepShock',
  'sleepDeep',
] as const;
export type TrackerMode = (typeof TRACKER_MODE_VALUES)[number];

export const DRIVER_STATUS_VALUES = ['active', 'inactive', 'onLeave', 'suspended'] as const;
export type DriverStatus = (typeof DRIVER_STATUS_VALUES)[number];

export const STAFF_ROLE_VALUES = [
  'teacher',
  'driver',
  'principal',
  'secretary',
  'receptionist',
  'accountant',
  'cleaner',
  'security',
  'librarian',
  'itSupport',
  'busAssistant',
  'assistant',
  'other',
] as const;
export type StaffRole = (typeof STAFF_ROLE_VALUES)[number];

export const STAFF_STATUS_VALUES = ['active', 'inactive', 'onLeave', 'suspended', 'terminated'] as const;
export type StaffStatus = (typeof STAFF_STATUS_VALUES)[number];

export const SHIFT_VALUES = ['morning', 'afternoon', 'evening', 'fullDay'] as const;
export type Shift = (typeof SHIFT_VALUES)[number];

export const COMPENSATION_MODE_VALUES = ['monthly', 'hourly'] as const;
export type CompensationMode = (typeof COMPENSATION_MODE_VALUES)[number];

export const VEHICLE_STATUS_VALUES = ['active', 'inactive', 'maintenance', 'retired'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUS_VALUES)[number];

export const VEHICLE_TYPE_VALUES = ['sedan', 'minibus', 'fullbus', 'shuttle'] as const;
export type VehicleType = (typeof VEHICLE_TYPE_VALUES)[number];

export const VEHICLE_DOCUMENT_TYPE_VALUES = [
  'insurance',
  'registration',
  'inspection',
  'emission',
  'license',
] as const;
export type VehicleDocumentType = (typeof VEHICLE_DOCUMENT_TYPE_VALUES)[number];

export const BUS_STATUS_VALUES = ['active', 'inactive', 'maintenance', 'retired'] as const;
export type BusStatus = (typeof BUS_STATUS_VALUES)[number];

export const REFUEL_STATUS_VALUES = ['pending', 'completed', 'cancelled'] as const;
export type RefuelStatus = (typeof REFUEL_STATUS_VALUES)[number];

export const FUEL_TYPE_VALUES = ['gasoline', 'diesel', 'electric', 'hybrid', 'lpg', 'cng'] as const;
export type FuelType = (typeof FUEL_TYPE_VALUES)[number];

export const MAINTENANCE_TYPE_VALUES = [
  'scheduled',
  'repair',
  'inspection',
  'oilChange',
  'filterChange',
  'other',
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPE_VALUES)[number];

export const MAINTENANCE_STATUS_VALUES = [
  'scheduled',
  'inProgress',
  'completed',
  'cancelled',
  'overdue',
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUS_VALUES)[number];

export const MARITAL_STATUS_VALUES = ['single', 'married', 'divorced', 'widowed', 'separated'] as const;
export type MaritalStatus = (typeof MARITAL_STATUS_VALUES)[number];

export const LLM_PROVIDER_VALUES = ['anthropic', 'openai', 'google', 'zai', 'ollama', 'custom'] as const;
export type LlmProvider = (typeof LLM_PROVIDER_VALUES)[number];
