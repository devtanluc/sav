CREATE TYPE "feed_item_state" AS ENUM('unread', 'read', 'dismissed', 'saved');--> statement-breakpoint
CREATE TYPE "feed_kind" AS ENUM('rss', 'youtube');--> statement-breakpoint
CREATE TYPE "link_source" AS ENUM('manual', 'extension', 'api', 'feed', 'email', 'x', 'import');--> statement-breakpoint
CREATE TYPE "link_state" AS ENUM('unread', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "link_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "plan" AS ENUM('free', 'plus', 'pro', 'team');--> statement-breakpoint
CREATE TYPE "subscription_status" AS ENUM('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');--> statement-breakpoint
CREATE TYPE "tag_source" AS ENUM('user', 'ai');--> statement-breakpoint
CREATE TYPE "usage_feature" AS ENUM('summary', 'auto_tag', 'embedding', 'chat', 'search_rewrite', 'transcript', 'pdf_extract', 'digest');--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"hash" text NOT NULL,
	"scopes" text[] DEFAULT '{read}'::text[] NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_balance" (
	"user_id" text,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone NOT NULL,
	"included" integer DEFAULT 0 NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_balance_pkey" PRIMARY KEY("user_id","period_start"),
	CONSTRAINT "credit_balance_used_nonneg" CHECK ("used" >= 0),
	CONSTRAINT "credit_balance_included_nonneg" CHECK ("included" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL UNIQUE,
	"plan" "plan" DEFAULT 'free'::"plan" NOT NULL,
	"status" "subscription_status" DEFAULT 'incomplete'::"subscription_status" NOT NULL,
	"polar_customer_id" text,
	"polar_subscription_id" text,
	"polar_product_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_ledger" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"feature" "usage_feature" NOT NULL,
	"model" text,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"byok" boolean DEFAULT false NOT NULL,
	"link_id" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" text PRIMARY KEY,
	"provider" text DEFAULT 'polar' NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "feed" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"site_url" text,
	"kind" "feed_kind" DEFAULT 'rss'::"feed_kind" NOT NULL,
	"title" text,
	"icon_url" text,
	"etag" text,
	"last_modified" text,
	"last_synced_at" timestamp with time zone,
	"next_sync_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sync_interval_seconds" integer DEFAULT 3600 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_item" (
	"id" text PRIMARY KEY,
	"feed_id" text NOT NULL,
	"user_id" text NOT NULL,
	"guid" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"author" text,
	"summary" text,
	"image_url" text,
	"published_at" timestamp with time zone,
	"state" "feed_item_state" DEFAULT 'unread'::"feed_item_state" NOT NULL,
	"link_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"canonical_url" text NOT NULL,
	"domain" text NOT NULL,
	"title" text,
	"description" text,
	"author" text,
	"site_name" text,
	"image_url" text,
	"favicon_url" text,
	"published_at" timestamp with time zone,
	"status" "link_status" DEFAULT 'pending'::"link_status" NOT NULL,
	"state" "link_state" DEFAULT 'unread'::"link_state" NOT NULL,
	"source" "link_source" DEFAULT 'manual'::"link_source" NOT NULL,
	"extract_error" text,
	"extract_attempts" integer DEFAULT 0 NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search_vector" tsvector GENERATED ALWAYS AS ((
        setweight(to_tsvector('simple', immutable_unaccent(coalesce(title, ''))), 'A') ||
        setweight(to_tsvector('simple', immutable_unaccent(coalesce(description, ''))), 'B') ||
        setweight(to_tsvector('simple', immutable_unaccent(coalesce(author, '') || ' ' || coalesce(site_name, '') || ' ' || domain)), 'C') ||
        setweight(to_tsvector('simple', immutable_unaccent(left(url, 2000))), 'D')
      )) STORED
);
--> statement-breakpoint
CREATE TABLE "link_content" (
	"link_id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"html" text,
	"text" text,
	"word_count" integer,
	"reading_time_minutes" integer,
	"lang" text,
	"content_hash" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', immutable_unaccent(left(coalesce(text, ''), 200000)))) STORED
);
--> statement-breakpoint
CREATE TABLE "link_embedding" (
	"id" text PRIMARY KEY,
	"link_id" text NOT NULL,
	"user_id" text NOT NULL,
	"chunk_idx" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model" text NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_enrichment" (
	"link_id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"summary" text,
	"model" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_link" (
	"collection_id" text,
	"link_id" text,
	"user_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_link_pkey" PRIMARY KEY("collection_id","link_id")
);
--> statement-breakpoint
CREATE TABLE "link_tag" (
	"link_id" text,
	"tag_id" text,
	"user_id" text NOT NULL,
	"source" "tag_source" DEFAULT 'user'::"tag_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "link_tag_pkey" PRIMARY KEY("link_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_hash_uq" ON "api_key" ("hash");--> statement-breakpoint
CREATE INDEX "api_key_user_idx" ON "api_key" ("user_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_polar_subscription_uq" ON "subscription" ("polar_subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_polar_customer_idx" ON "subscription" ("polar_customer_id");--> statement-breakpoint
CREATE INDEX "usage_ledger_user_created_idx" ON "usage_ledger" ("user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "usage_ledger_feature_created_idx" ON "usage_ledger" ("feature","created_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_provider_event_uq" ON "webhook_event" ("provider","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feed_user_url_uq" ON "feed" ("user_id","url");--> statement-breakpoint
CREATE INDEX "feed_due_idx" ON "feed" ("next_sync_at") WHERE active = true;--> statement-breakpoint
CREATE UNIQUE INDEX "feed_item_feed_guid_uq" ON "feed_item" ("feed_id","guid");--> statement-breakpoint
CREATE INDEX "feed_item_user_published_idx" ON "feed_item" ("user_id","published_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "feed_item_user_state_idx" ON "feed_item" ("user_id","state","published_at" DESC);--> statement-breakpoint
CREATE INDEX "feed_item_link_idx" ON "feed_item" ("link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "link_user_canonical_url_uq" ON "link" ("user_id","canonical_url");--> statement-breakpoint
CREATE INDEX "link_user_saved_at_idx" ON "link" ("user_id","saved_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "link_user_state_saved_at_idx" ON "link" ("user_id","state","saved_at" DESC) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "link_user_domain_idx" ON "link" ("user_id","domain");--> statement-breakpoint
CREATE INDEX "link_pending_idx" ON "link" ("created_at") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "link_search_idx" ON "link" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "link_title_trgm_idx" ON "link" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "link_content_user_idx" ON "link_content" ("user_id");--> statement-breakpoint
CREATE INDEX "link_content_search_idx" ON "link_content" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "link_embedding_link_chunk_uq" ON "link_embedding" ("link_id","chunk_idx");--> statement-breakpoint
CREATE INDEX "link_embedding_user_idx" ON "link_embedding" ("user_id");--> statement-breakpoint
CREATE INDEX "link_embedding_hnsw_idx" ON "link_embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "link_enrichment_user_idx" ON "link_enrichment" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_user_name_uq" ON "collection" ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "collection_user_position_idx" ON "collection" ("user_id","position");--> statement-breakpoint
CREATE INDEX "collection_link_link_idx" ON "collection_link" ("link_id");--> statement-breakpoint
CREATE INDEX "collection_link_user_idx" ON "collection_link" ("user_id");--> statement-breakpoint
CREATE INDEX "link_tag_tag_idx" ON "link_tag" ("tag_id");--> statement-breakpoint
CREATE INDEX "link_tag_user_idx" ON "link_tag" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_user_name_uq" ON "tag" ("user_id",lower("name"));--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "credit_balance" ADD CONSTRAINT "credit_balance_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_link_id_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "link"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "feed" ADD CONSTRAINT "feed_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feed_item" ADD CONSTRAINT "feed_item_feed_id_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feed"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feed_item" ADD CONSTRAINT "feed_item_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feed_item" ADD CONSTRAINT "feed_item_link_id_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "link"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "link_content" ADD CONSTRAINT "link_content_link_id_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "link"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "link_content" ADD CONSTRAINT "link_content_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "link_embedding" ADD CONSTRAINT "link_embedding_link_id_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "link"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "link_embedding" ADD CONSTRAINT "link_embedding_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "link_enrichment" ADD CONSTRAINT "link_enrichment_link_id_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "link"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "link_enrichment" ADD CONSTRAINT "link_enrichment_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "collection_link" ADD CONSTRAINT "collection_link_collection_id_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collection"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "collection_link" ADD CONSTRAINT "collection_link_link_id_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "link"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "collection_link" ADD CONSTRAINT "collection_link_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "link_tag" ADD CONSTRAINT "link_tag_link_id_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "link"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "link_tag" ADD CONSTRAINT "link_tag_tag_id_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "link_tag" ADD CONSTRAINT "link_tag_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;