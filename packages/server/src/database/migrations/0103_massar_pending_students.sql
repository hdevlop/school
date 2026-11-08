ALTER TABLE "massar_classes" ADD COLUMN "pending_students" jsonb DEFAULT '[]'::jsonb NOT NULL;
