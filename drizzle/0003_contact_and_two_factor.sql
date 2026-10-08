CREATE TABLE "ContactMessage" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"department" text NOT NULL,
	"message" text NOT NULL,
	"ip" text,
	"userAgent" text,
	"status" text DEFAULT 'NEW' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "totpSecret" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "totpEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "backupCodes" text[] DEFAULT ARRAY[]::text[] NOT NULL;