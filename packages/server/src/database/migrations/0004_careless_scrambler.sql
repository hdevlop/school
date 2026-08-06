CREATE TYPE "public"."tokenStatus" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."tokenType" AS ENUM('access', 'refresh');--> statement-breakpoint
CREATE TYPE "public"."userStatus" AS ENUM('active', 'inactive', 'pending');