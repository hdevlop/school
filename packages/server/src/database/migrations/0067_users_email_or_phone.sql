-- najm-auth 6.4.0: an account is reached by its email, its phone, or both.
-- Email was NOT NULL, so every account created without one was stored as ""
-- and the second such account failed users_email_unique ("User identity
-- already exists"). A blank email becomes NULL, which the unique index allows
-- any number of times.
--
-- The check is added NOT VALID: it holds for every new or updated row, but
-- does not reject existing accounts created with neither (School did not pass
-- a phone to the account before). Such an account must be given an email or
-- a phone the next time it is saved.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
UPDATE "users" SET "email" = NULL WHERE btrim("email") = '';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_or_phone" CHECK ("users"."email" is not null or "users"."phone" is not null) NOT VALID;
