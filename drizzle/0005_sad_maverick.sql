CREATE TABLE "DeletedArticleSlug" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text,
	"deletedAt" timestamp (3) DEFAULT now() NOT NULL
);
