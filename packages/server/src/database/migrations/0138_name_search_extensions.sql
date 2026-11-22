-- Name search tolerates spelling: "jbara rima" finds JEBARA RIMA, "mohammed"
-- MOHAMED, "helene" HÉLÈNE. pg_trgm scores how close a query is to a name and
-- unaccent drops accents; both ship with PostgreSQL and are trusted
-- extensions, so the database owner may create them.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
