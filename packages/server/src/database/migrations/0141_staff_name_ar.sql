-- A staff member's name in Arabic, for what School prints in Arabic (a teacher's desk card).
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "name_ar" text;
