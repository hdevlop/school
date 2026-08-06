CREATE TYPE "public"."busStatus" AS ENUM('active', 'inactive', 'maintenance', 'retired');--> statement-breakpoint
CREATE TYPE "public"."examSecurity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."fuelType" AS ENUM('gasoline', 'diesel', 'electric', 'hybrid', 'lpg', 'cng');--> statement-breakpoint
CREATE TYPE "public"."participantType" AS ENUM('student', 'teacher', 'parent', 'staff');--> statement-breakpoint
CREATE TYPE "public"."refuelStatus" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."submissionType" AS ENUM('online', 'paper', 'presentation', 'practical', 'discussion');--> statement-breakpoint
CREATE TYPE "public"."vehicleDocumentType" AS ENUM('insurance', 'registration', 'inspection', 'emission', 'license');--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "token_family" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lockout_until" timestamp;--> statement-breakpoint
CREATE INDEX "tokens_expires_at_idx" ON "tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_role_id_idx" ON "users" USING btree ("role_id");