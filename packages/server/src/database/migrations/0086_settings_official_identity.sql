ALTER TABLE "settings" ADD COLUMN "school_name_ar" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "school_address_ar" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "school_phones" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "school_license_number" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "school_license_date" date;--> statement-breakpoint
-- The school's existing installation starts with the identity printed on its
-- official forms, so no one types it again; Settings edits it afterwards. A new
-- installation starts empty: these are one school's values, not defaults.
UPDATE "settings"
SET "school_name_ar" = COALESCE("school_name_ar", 'مؤسسة جان هنري لامبير'),
    "school_address_ar" = COALESCE("school_address_ar", 'شارع الإمام مالك، إقامات بغداد و ماجوريل، حي القدس، البرنوصي'),
    "school_phones" = COALESCE("school_phones", '["0522750085", "0808524592", "0668095157"]'::jsonb),
    "school_license_number" = COALESCE("school_license_number", '2015/100.119'),
    "school_license_date" = COALESCE("school_license_date", DATE '2015-10-19'),
    "updated_at" = now();
