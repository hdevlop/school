ALTER TABLE "classes" DROP CONSTRAINT "classes_name_unique";--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_name_academic_year_unique" UNIQUE("name","academic_year");
