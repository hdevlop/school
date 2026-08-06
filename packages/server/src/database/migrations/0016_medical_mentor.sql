CREATE TYPE "public"."payslipStatus" AS ENUM('pending', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"staff_name" text NOT NULL,
	"staff_role" text NOT NULL,
	"period" text NOT NULL,
	"base_salary" numeric(10, 2) NOT NULL,
	"total_allowances" numeric(10, 2) DEFAULT '0',
	"total_deductions" numeric(10, 2) DEFAULT '0',
	"gross_amount" numeric(10, 2) NOT NULL,
	"net_amount" numeric(10, 2) NOT NULL,
	"status" "payslipStatus" DEFAULT 'pending' NOT NULL,
	"payment_method" "paymentMethod",
	"payment_date" date,
	"payslip_number" text,
	"transaction_ref" text,
	"processed_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payslips_payslip_number_unique" UNIQUE("payslip_number")
);
--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payslips_staff_period_unique" ON "payslips" USING btree ("staff_id","period");