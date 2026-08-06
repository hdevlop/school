INSERT INTO "staff" (
  "id", "user_id", "employee_code", "name", "cin", "gender", "phone", "address", "role",
  "salary", "compensation_mode", "workload_hours", "employment_type", "hire_date", "status",
  "bank_account", "emergency_contact", "emergency_phone", "created_at", "updated_at"
)
SELECT
  't_' || "id", "user_id", 'EMP-T-' || "id", "name", "cin", "gender", "phone", "address", 'teacher',
  "salary", 'monthly', "workload_hours", "employment_type", "hire_date",
  COALESCE("status"::text, 'active')::"staffStatus",
  "bank_account", "emergency_contact", "emergency_phone", "created_at", "updated_at"
FROM "teachers"
WHERE "staff_id" IS NULL;--> statement-breakpoint
UPDATE "teachers" SET "staff_id" = 't_' || "id" WHERE "staff_id" IS NULL;--> statement-breakpoint
INSERT INTO "staff" (
  "id", "user_id", "employee_code", "name", "cin", "gender", "phone", "address", "role",
  "salary", "compensation_mode", "hire_date", "status", "emergency_contact", "emergency_phone",
  "created_at", "updated_at"
)
SELECT
  'd_' || "id", "user_id", 'EMP-D-' || "id", "name", "cin", "gender", "phone", "address", 'driver',
  "salary", 'monthly', "hire_date",
  COALESCE(NULLIF("status"::text, 'on_leave'), 'active')::"staffStatus",
  "emergency_contact", "emergency_phone", "created_at", "updated_at"
FROM "drivers"
WHERE "staff_id" IS NULL;--> statement-breakpoint
UPDATE "drivers" SET "staff_id" = 'd_' || "id" WHERE "staff_id" IS NULL;--> statement-breakpoint
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_user_id_unique";--> statement-breakpoint
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_cin_unique";--> statement-breakpoint
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_user_id_unique";--> statement-breakpoint
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_cin_unique";--> statement-breakpoint
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "staff_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teachers" ALTER COLUMN "staff_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "cin";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "hire_date";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "gender";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "salary";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "emergency_contact";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "emergency_phone";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "cin";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "gender";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "salary";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "hire_date";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "bank_account";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "emergency_contact";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "emergency_phone";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "employment_type";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "workload_hours";--> statement-breakpoint
ALTER TABLE "teachers" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."driverStatus";--> statement-breakpoint
DROP TYPE "public"."teacherStatus";
