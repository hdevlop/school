-- Each competency and sub-domain is followed from one month to another, so a
-- teacher's change in November leaves September's list and levels as they were.
-- Null on both ends is the whole year: every existing list stays as it is. Additive.
ALTER TABLE "competencies" ADD COLUMN "from_month" text;--> statement-breakpoint
ALTER TABLE "competencies" ADD COLUMN "until_month" text;--> statement-breakpoint
ALTER TABLE "competency_domains" ADD COLUMN "from_month" text;--> statement-breakpoint
ALTER TABLE "competency_domains" ADD COLUMN "until_month" text;--> statement-breakpoint
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_months_check" CHECK ("competencies"."until_month" is null or "competencies"."from_month" is null or "competencies"."until_month" >= "competencies"."from_month");--> statement-breakpoint
ALTER TABLE "competency_domains" ADD CONSTRAINT "competency_domains_months_check" CHECK ("competency_domains"."until_month" is null or "competency_domains"."from_month" is null or "competency_domains"."until_month" >= "competency_domains"."from_month");