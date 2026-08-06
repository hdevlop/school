CREATE TYPE "public"."alertPriority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alertStatus" AS ENUM('active', 'acknowledged', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."alertType" AS ENUM('academic', 'attendance', 'behavioral', 'health', 'system', 'announcement', 'reminder', 'emergency');--> statement-breakpoint
CREATE TYPE "public"."assessmentStatus" AS ENUM('scheduled', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."assessmentType" AS ENUM('quiz', 'assignment', 'project', 'participation', 'test', 'presentation');--> statement-breakpoint
CREATE TYPE "public"."assignmentStatus" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."attendanceStatus" AS ENUM('present', 'absent', 'late', 'excused');--> statement-breakpoint
CREATE TYPE "public"."busStatus" AS ENUM('active', 'inactive', 'maintenance', 'retired');--> statement-breakpoint
CREATE TYPE "public"."calendarSystem" AS ENUM('SEMESTER', 'TRIMESTER', 'QUARTER');--> statement-breakpoint
CREATE TYPE "public"."classStatus" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dayOfWeek" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."driverStatus" AS ENUM('active', 'inactive', 'onLeave', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."employmentType" AS ENUM('fullTime', 'partTime', 'contract', 'temporary');--> statement-breakpoint
CREATE TYPE "public"."enrollmentStatus" AS ENUM('enrolled', 'completed', 'dropped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."eventStatus" AS ENUM('scheduled', 'ongoing', 'completed', 'cancelled', 'postponed');--> statement-breakpoint
CREATE TYPE "public"."eventType" AS ENUM('academic', 'sports', 'cultural', 'holiday', 'exam', 'meeting', 'workshop', 'fieldtrip', 'ceremony', 'conference', 'other');--> statement-breakpoint
CREATE TYPE "public"."eventVisibility" AS ENUM('public', 'private', 'teachers', 'students', 'parents', 'staff');--> statement-breakpoint
CREATE TYPE "public"."examSecurity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."examStatus" AS ENUM('scheduled', 'active', 'completed', 'cancelled', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."examType" AS ENUM('midterm', 'final', 'standardized');--> statement-breakpoint
CREATE TYPE "public"."expenseCategory" AS ENUM('salary', 'utilities', 'maintenance', 'supplies', 'equipment', 'transport', 'food', 'security', 'cleaning', 'insurance', 'rent', 'tax', 'marketing', 'training', 'technology', 'miscellaneous');--> statement-breakpoint
CREATE TYPE "public"."expenseStatus" AS ENUM('pending', 'approved', 'paid', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."feeInstallmentStatus" AS ENUM('pending', 'partiallyPaid', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."feeStatus" AS ENUM('pending', 'partiallyPaid', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."feeTypeStatus" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."fileStatus" AS ENUM('active', 'deleted', 'archived');--> statement-breakpoint
CREATE TYPE "public"."fuelType" AS ENUM('gasoline', 'diesel', 'electric', 'hybrid', 'lpg', 'cng');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TYPE "public"."gradeStatus" AS ENUM('graded', 'pending', 'draft', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'fr', 'ar', 'es');--> statement-breakpoint
CREATE TYPE "public"."maintenanceStatus" AS ENUM('scheduled', 'inProgress', 'completed', 'cancelled', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."maintenanceType" AS ENUM('scheduled', 'repair', 'inspection', 'oilChange', 'filterChange', 'other');--> statement-breakpoint
CREATE TYPE "public"."maritalStatus" AS ENUM('single', 'married', 'divorced', 'widowed', 'separated');--> statement-breakpoint
CREATE TYPE "public"."participantType" AS ENUM('student', 'teacher', 'parent', 'staff');--> statement-breakpoint
CREATE TYPE "public"."paymentMethod" AS ENUM('cash', 'bankTransfer', 'check', 'creditCard', 'debitCard', 'online', 'mobilePayment');--> statement-breakpoint
CREATE TYPE "public"."paymentStatus" AS ENUM('completed', 'pending', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."paymentType" AS ENUM('recurring', 'oneTime');--> statement-breakpoint
CREATE TYPE "public"."proficiencyLevel" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
CREATE TYPE "public"."refuelStatus" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."relationshipType" AS ENUM('father', 'mother', 'guardian', 'stepparent', 'grandparent', 'other');--> statement-breakpoint
CREATE TYPE "public"."schedule" AS ENUM('monthly', 'quarterly', 'semester', 'annually', 'oneTime');--> statement-breakpoint
CREATE TYPE "public"."sectionStatus" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."semester" AS ENUM('spring', 'summer', 'fall', 'winter');--> statement-breakpoint
CREATE TYPE "public"."studentStatus" AS ENUM('active', 'inactive', 'graduated', 'transferred');--> statement-breakpoint
CREATE TYPE "public"."submissionType" AS ENUM('online', 'paper', 'presentation', 'practical', 'discussion');--> statement-breakpoint
CREATE TYPE "public"."teacherStatus" AS ENUM('active', 'inactive', 'onLeave');--> statement-breakpoint
CREATE TYPE "public"."tokenStatus" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."tokenType" AS ENUM('access', 'refresh');--> statement-breakpoint
CREATE TYPE "public"."trackerMode" AS ENUM('tracking', 'gprs', 'sms', 'sleepTime', 'sleepShock', 'sleepDeep');--> statement-breakpoint
CREATE TYPE "public"."userStatus" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TYPE "public"."userType" AS ENUM('admin', 'teacher', 'student', 'parent');--> statement-breakpoint
CREATE TYPE "public"."vehicleDocumentType" AS ENUM('insurance', 'registration', 'inspection', 'emission', 'license');--> statement-breakpoint
CREATE TYPE "public"."vehicleStatus" AS ENUM('active', 'inactive', 'maintenance', 'retired');--> statement-breakpoint
CREATE TYPE "public"."vehicleType" AS ENUM('sedan', 'minibus', 'fullbus', 'shuttle');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"student_id" text,
	"teacher_id" text,
	"teacher_assignment_id" text,
	"type" "alertType" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"priority" "alertPriority" DEFAULT 'medium',
	"status" "alertStatus" DEFAULT 'active',
	"target_audience" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"class_id" text,
	"section_id" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"target_audience" text NOT NULL,
	"is_published" boolean DEFAULT false,
	"publish_date" timestamp,
	"expiry_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_assignment_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "assessmentType" DEFAULT 'quiz' NOT NULL,
	"date" date NOT NULL,
	"duration" integer,
	"total_marks" numeric(5, 2) NOT NULL,
	"passing_marks" numeric(5, 2) NOT NULL,
	"instructions" text,
	"status" "assessmentStatus" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"teacher_assignment_id" text NOT NULL,
	"date" date NOT NULL,
	"status" "attendanceStatus" DEFAULT 'present' NOT NULL,
	"notes" text,
	"marked_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_role" text NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"status" text NOT NULL,
	"ip_address" text,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"academic_year" text NOT NULL,
	"level" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "classes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"cin" text,
	"license_number" text NOT NULL,
	"license_type" text NOT NULL,
	"license_expiry" date NOT NULL,
	"hire_date" date NOT NULL,
	"phone" text,
	"address" text,
	"gender" "gender",
	"years_of_experience" integer,
	"salary" numeric(10, 2),
	"emergency_contact" text,
	"emergency_phone" text,
	"status" "driverStatus" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "drivers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "drivers_cin_unique" UNIQUE("cin"),
	CONSTRAINT "drivers_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"participant_type" text NOT NULL,
	"registration_date" timestamp DEFAULT now(),
	"attendance_status" "attendanceStatus",
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"class_id" text,
	"section_id" text,
	"title" text NOT NULL,
	"description" text,
	"type" "eventType" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"location" text,
	"venue" text,
	"visibility" "eventVisibility" DEFAULT 'public',
	"status" "eventStatus" DEFAULT 'scheduled',
	"capacity" integer,
	"registration_required" boolean DEFAULT false,
	"registration_deadline" date,
	"attachments" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_assignment_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "examType" DEFAULT 'midterm' NOT NULL,
	"date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"duration" integer NOT NULL,
	"total_marks" numeric(5, 2) NOT NULL,
	"passing_marks" numeric(5, 2) NOT NULL,
	"room_number" text,
	"instructions" text,
	"status" "examStatus" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"category" "expenseCategory" NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"expense_date" date NOT NULL,
	"payment_method" "paymentMethod",
	"payment_date" date,
	"invoice_number" text,
	"receipt_number" text,
	"check_number" text,
	"status" "expenseStatus" DEFAULT 'pending',
	"approved_by" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"paid_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fee_installments" (
	"id" text PRIMARY KEY NOT NULL,
	"fee_id" text NOT NULL,
	"number" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0',
	"status" "feeInstallmentStatus" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fee_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_type" "paymentType" DEFAULT 'recurring' NOT NULL,
	"status" "feeTypeStatus" DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fees" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"fee_type_id" text NOT NULL,
	"schedule" "schedule" DEFAULT 'oneTime',
	"academic_year" text NOT NULL,
	"base_amount" numeric(10, 2) NOT NULL,
	"gross_amount" numeric(10, 2) NOT NULL,
	"net_amount" numeric(10, 2) NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0',
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"discount_reason" text DEFAULT '',
	"status" "feeStatus" DEFAULT 'pending' NOT NULL,
	"assigned_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"abs_path" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"type" text,
	"category" text,
	"entity_id" text,
	"is_public" boolean DEFAULT false,
	"status" "fileStatus" DEFAULT 'active',
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "files_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"assessment_id" text NOT NULL,
	"exam_id" text NOT NULL,
	"marks_obtained" numeric(5, 2) NOT NULL,
	"feedback" text,
	"status" "gradeStatus" DEFAULT 'graded' NOT NULL,
	"graded_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"type" "maintenanceType" NOT NULL,
	"title" text NOT NULL,
	"status" "maintenanceStatus" DEFAULT 'scheduled',
	"due_hours" numeric(10, 2),
	"cost" numeric(8, 2),
	"scheduled_date" date,
	"completed_at" timestamp,
	"priority" text DEFAULT 'normal',
	"parts_used" text,
	"assigned_to" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"cin" text,
	"phone" text,
	"gender" "gender",
	"address" text,
	"date_of_birth" date,
	"age" integer,
	"occupation" text,
	"relationship_type" "relationshipType" NOT NULL,
	"nationality" text,
	"marital_status" "maritalStatus",
	"is_emergency_contact" boolean DEFAULT false,
	"financial_responsibility" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "parents_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "parents_cin_unique" UNIQUE("cin")
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"fee_id" text NOT NULL,
	"installment_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"type" text DEFAULT 'fee',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" "paymentMethod" NOT NULL,
	"check_number" text,
	"check_due_date" date,
	"transaction_ref" text,
	"receipt_number" text,
	"status" "paymentStatus" DEFAULT 'completed',
	"processed_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payments_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "refuels" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"operator_id" text NOT NULL,
	"datetime" timestamp NOT NULL,
	"voucher_number" text,
	"liters" numeric(8, 2) NOT NULL,
	"cost_per_liter" numeric(6, 2),
	"total_cost" numeric(10, 2),
	"mileage_at_refuel" numeric(10, 2),
	"fuel_level_after" numeric(5, 1) DEFAULT '100',
	"attendant" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" text PRIMARY KEY NOT NULL,
	"class_id" text NOT NULL,
	"name" text NOT NULL,
	"max_students" integer DEFAULT 30,
	"room_number" text,
	"status" "sectionStatus" DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"school_name" text NOT NULL,
	"school_address" text,
	"school_phone" text,
	"school_email" text,
	"school_website" text,
	"school_logo" text,
	"current_academic_year" text NOT NULL,
	"grading_scale" jsonb,
	"attendance_requirement" numeric(5, 2) DEFAULT '75.00',
	"max_class_size" integer DEFAULT 34,
	"minimum_passing_grade" numeric(5, 2) DEFAULT '60.00',
	"default_exam_duration" integer DEFAULT 120,
	"calendar_system" "calendarSystem" DEFAULT 'SEMESTER',
	"start_month" text DEFAULT 'september',
	"end_month" text DEFAULT 'june',
	"academic_alerts" boolean DEFAULT true,
	"attendance_alerts" boolean DEFAULT true,
	"event_alerts" boolean DEFAULT true,
	"homework_alerts" boolean DEFAULT true,
	"fees_reminder" boolean DEFAULT true,
	"fees_overdue_alerts" boolean DEFAULT true,
	"email_notifications" boolean DEFAULT true,
	"sms_notifications" boolean DEFAULT false,
	"parent_notifications" boolean DEFAULT true,
	"low_grade_alerts" boolean DEFAULT true,
	"allow_late_submission" boolean DEFAULT true,
	"exam_results_alerts" boolean DEFAULT true,
	"disciplinary_alerts" boolean DEFAULT true,
	"achievement_alerts" boolean DEFAULT true,
	"maintenance_notifications" boolean DEFAULT true,
	"two_factor_enabled" boolean DEFAULT false,
	"session_timeout" text DEFAULT '60',
	"password_require_symbols" boolean DEFAULT true,
	"login_notifications" boolean DEFAULT true,
	"parent_access_enabled" boolean DEFAULT true,
	"teacher_access_enabled" boolean DEFAULT true,
	"student_access_enabled" boolean DEFAULT true,
	"time_zone" text DEFAULT 'UTC',
	"language" "language" DEFAULT 'en',
	"theme" text DEFAULT 'system',
	"date_format" text DEFAULT 'MM/DD/YYYY',
	"time_format" text DEFAULT '12',
	"currency" text DEFAULT 'USD',
	"grading_periods" integer DEFAULT 4,
	"school_start_time" text DEFAULT '08:00',
	"school_end_time" text DEFAULT '15:00',
	"lunch_break_duration" integer DEFAULT 30,
	"maintenance_mode" boolean DEFAULT false,
	"auto_backup" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_parents" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"parent_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"class_id" text NOT NULL,
	"section_id" text NOT NULL,
	"student_code" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"date_of_birth" date,
	"age" integer,
	"gender" "gender",
	"enrollment_date" date NOT NULL,
	"medical_conditions" text,
	"previous_school" text,
	"status" "studentStatus" DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "students_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "students_student_code_unique" UNIQUE("student_code")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subjects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "teacher_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"section_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cin" text,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"gender" "gender",
	"specialization" text,
	"salary" numeric(10, 2),
	"hire_date" date NOT NULL,
	"years_of_experience" integer,
	"bank_account" text,
	"emergency_contact" text,
	"emergency_phone" text,
	"employment_type" "employmentType",
	"workload_hours" integer,
	"academic_degrees" text,
	"status" "teacherStatus" DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "teachers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "teachers_cin_unique" UNIQUE("cin")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"type" "tokenType" DEFAULT 'refresh',
	"status" "tokenStatus" DEFAULT 'active',
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"password" text NOT NULL,
	"image" text DEFAULT 'noavatar.png',
	"status" "userStatus" DEFAULT 'pending',
	"role_id" text,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"assignment_date" date DEFAULT CURRENT_DATE NOT NULL,
	"unassignment_date" date,
	"status" "assignmentStatus" DEFAULT 'active' NOT NULL,
	"notes" text,
	"assigned_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"type" "vehicleType" DEFAULT 'fullbus' NOT NULL,
	"capacity" integer NOT NULL,
	"license_plate" text NOT NULL,
	"purchase_date" date DEFAULT CURRENT_DATE,
	"purchase_price" numeric(12, 2) DEFAULT '0',
	"initial_mileage" numeric(10, 2) DEFAULT '0',
	"current_mileage" numeric(10, 2) DEFAULT '0',
	"status" "vehicleStatus" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_license_plate_unique" UNIQUE("license_plate")
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_teacher_assignment_id_teacher_assignments_id_fk" FOREIGN KEY ("teacher_assignment_id") REFERENCES "public"."teacher_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_fee_id_fees_id_fk" FOREIGN KEY ("fee_id") REFERENCES "public"."fees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_fee_type_id_fee_types_id_fk" FOREIGN KEY ("fee_type_id") REFERENCES "public"."fee_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_fee_id_fees_id_fk" FOREIGN KEY ("fee_id") REFERENCES "public"."fees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_installment_id_fee_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."fee_installments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refuels" ADD CONSTRAINT "refuels_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refuels" ADD CONSTRAINT "refuels_operator_id_drivers_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;