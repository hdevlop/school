CREATE TYPE "public"."compensationMode" AS ENUM('monthly', 'hourly');--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
UPDATE "expenses" SET "category" = 'miscellaneous' WHERE "category" = 'salary';--> statement-breakpoint
DROP TYPE "public"."expenseCategory";--> statement-breakpoint
CREATE TYPE "public"."expenseCategory" AS ENUM('utilities', 'maintenance', 'supplies', 'equipment', 'transport', 'food', 'security', 'cleaning', 'insurance', 'rent', 'tax', 'marketing', 'training', 'technology', 'miscellaneous');--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "category" SET DATA TYPE "public"."expenseCategory" USING "category"::"public"."expenseCategory";--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "compensation_mode" "compensationMode" DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "hourly_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "workload_hours" integer;
