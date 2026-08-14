-- Historical snapshots included these two staff-assignment tables, but no
-- migration created them. Keep this repair additive and safe for databases
-- where an operator may already have supplied the missing tables.
CREATE TABLE IF NOT EXISTS "security_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "staff_id" text NOT NULL,
  "status" "assignmentStatus" DEFAULT 'active' NOT NULL,
  "start_date" date,
  "end_date" date,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "zone_id" text NOT NULL,
  CONSTRAINT "security_assignments_staff_id_staff_id_fk"
    FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id")
    ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "security_assignments_zone_id_zones_id_fk"
    FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id")
    ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bus_assistant_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "staff_id" text NOT NULL,
  "status" "assignmentStatus" DEFAULT 'active' NOT NULL,
  "start_date" date,
  "end_date" date,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "vehicle_id" text NOT NULL,
  CONSTRAINT "bus_assistant_assignments_staff_id_staff_id_fk"
    FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id")
    ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "bus_assistant_assignments_vehicle_id_vehicles_id_fk"
    FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id")
    ON DELETE restrict ON UPDATE no action
);
