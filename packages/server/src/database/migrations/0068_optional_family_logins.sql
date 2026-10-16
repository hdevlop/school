ALTER TABLE "parents" DROP CONSTRAINT "parents_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "students_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "parents" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "image" text;--> statement-breakpoint
UPDATE "parents" SET "image" = "users"."image" FROM "users" WHERE "parents"."user_id" = "users"."id";--> statement-breakpoint
UPDATE "students" SET "image" = "users"."image" FROM "users" WHERE "students"."user_id" = "users"."id";--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
