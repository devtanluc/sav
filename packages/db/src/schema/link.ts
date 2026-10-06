import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	uniqueIndex,
	vector,
} from "drizzle-orm/pg-core";

import { linkSource, linkState, linkStatus } from "./enums";
import {
	createdAt,
	EMBEDDING_DIMENSIONS,
	pkId,
	timestamptz,
	tsvector,
	updatedAt,
	userId,
} from "./helpers";

/**
 * Tìm kiếm tiếng Việt không dấu: dùng cấu hình `simple` + `immutable_unaccent()`.
 * Hàm `immutable_unaccent` và các extension (unaccent, pg_trgm, vector) được tạo trong
 * migration tùy chỉnh — xem `src/sql/extensions.sql`. PHẢI chạy migration đó trước các migration bảng.
 */

export const link = pgTable(
	"link",
	{
		id: pkId(),
		userId: userId(),

		/** URL người dùng gửi lên (giữ nguyên để hiển thị). */
		url: text("url").notNull(),
		/** URL đã chuẩn hóa (bỏ tracking params, hạ chữ thường host...) — khóa dedupe. */
		canonicalUrl: text("canonical_url").notNull(),
		domain: text("domain").notNull(),

		title: text("title"),
		description: text("description"),
		author: text("author"),
		siteName: text("site_name"),
		imageUrl: text("image_url"),
		faviconUrl: text("favicon_url"),
		publishedAt: timestamptz("published_at"),

		status: linkStatus("status").default("pending").notNull(),
		state: linkState("state").default("unread").notNull(),
		source: linkSource("source").default("manual").notNull(),

		extractError: text("extract_error"),
		extractAttempts: integer("extract_attempts").default(0).notNull(),

		savedAt: timestamptz("saved_at").defaultNow().notNull(),
		readAt: timestamptz("read_at"),
		archivedAt: timestamptz("archived_at"),
		/** Xóa mềm. Lưu lại cùng URL thì khôi phục bản ghi này (unique theo canonical_url). */
		deletedAt: timestamptz("deleted_at"),

		createdAt: createdAt(),
		updatedAt: updatedAt(),

		/** Tìm kiếm trên metadata. Nội dung bài nằm ở `link_content.search_vector`. */
		searchVector: tsvector("search_vector").generatedAlwaysAs(
			sql`(
        setweight(to_tsvector('simple', immutable_unaccent(coalesce(title, ''))), 'A') ||
        setweight(to_tsvector('simple', immutable_unaccent(coalesce(description, ''))), 'B') ||
        setweight(to_tsvector('simple', immutable_unaccent(coalesce(author, '') || ' ' || coalesce(site_name, '') || ' ' || domain)), 'C') ||
        setweight(to_tsvector('simple', immutable_unaccent(left(url, 2000))), 'D')
      )`,
		),
	},
	(t) => [
		// Dedupe: một canonical URL / người dùng.
		uniqueIndex("link_user_canonical_url_uq").on(t.userId, t.canonicalUrl),
		// Danh sách chính, phân trang cursor theo (saved_at, id).
		index("link_user_saved_at_idx").on(
			t.userId,
			t.savedAt.desc().nullsFirst(),
			t.id.desc().nullsFirst(),
		),
		// Lọc theo trạng thái đọc (loại link đã xóa mềm).
		index("link_user_state_saved_at_idx")
			.on(t.userId, t.state, t.savedAt.desc().nullsFirst())
			.where(sql`deleted_at is null`),
		index("link_user_domain_idx").on(t.userId, t.domain),
		// Worker dọn link `pending` bị kẹt.
		index("link_pending_idx").on(t.createdAt).where(sql`status = 'pending'`),
		index("link_search_idx").using("gin", t.searchVector),
		// Gõ gần đúng cho tiêu đề.
		index("link_title_trgm_idx").using("gin", t.title.op("gin_trgm_ops")),
	],
);

/** Nội dung đã trích xuất. Tách bảng để danh sách link luôn nhẹ. */
export const linkContent = pgTable(
	"link_content",
	{
		linkId: text("link_id")
			.primaryKey()
			.references(() => link.id, { onDelete: "cascade" }),
		userId: userId(),

		/** HTML đã sanitize (chỉ render trong sandbox/iframe). */
		html: text("html"),
		text: text("text"),
		wordCount: integer("word_count"),
		readingTimeMinutes: integer("reading_time_minutes"),
		lang: text("lang"),
		/** Hash của `text`; dùng làm cache key để không enrich lại nội dung giống hệt. */
		contentHash: text("content_hash"),
		fetchedAt: timestamptz("fetched_at").defaultNow().notNull(),

		/** `left(..., 200000)` vì tsvector giới hạn ~1MB, bài quá dài sẽ làm INSERT lỗi. */
		searchVector: tsvector("search_vector").generatedAlwaysAs(
			sql`to_tsvector('simple', immutable_unaccent(left(coalesce(text, ''), 200000)))`,
		),
	},
	(t) => [
		index("link_content_user_idx").on(t.userId),
		index("link_content_search_idx").using("gin", t.searchVector),
	],
);

/** Kết quả AI (tóm tắt...). Một bản ghi / link. */
export const linkEnrichment = pgTable(
	"link_enrichment",
	{
		linkId: text("link_id")
			.primaryKey()
			.references(() => link.id, { onDelete: "cascade" }),
		userId: userId(),

		summary: text("summary"),
		model: text("model"),
		tokensIn: integer("tokens_in"),
		tokensOut: integer("tokens_out"),
		/** `content_hash` của nội dung đã được enrich — khác hash thì mới enrich lại. */
		contentHash: text("content_hash"),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(t) => [index("link_enrichment_user_idx").on(t.userId)],
);

/** Embedding theo chunk cho tìm kiếm ngữ nghĩa / RAG. */
export const linkEmbedding = pgTable(
	"link_embedding",
	{
		id: pkId(),
		linkId: text("link_id")
			.notNull()
			.references(() => link.id, { onDelete: "cascade" }),
		userId: userId(),

		chunkIdx: integer("chunk_idx").notNull(),
		/** Đoạn văn bản gốc của chunk — dùng để trích dẫn trong RAG. */
		chunkText: text("chunk_text").notNull(),
		embedding: vector("embedding", {
			dimensions: EMBEDDING_DIMENSIONS,
		}).notNull(),
		model: text("model").notNull(),
		contentHash: text("content_hash"),
		createdAt: createdAt(),
	},
	(t) => [
		uniqueIndex("link_embedding_link_chunk_uq").on(t.linkId, t.chunkIdx),
		index("link_embedding_user_idx").on(t.userId),
		// Khi truy vấn: SET hnsw.iterative_scan = relaxed_order (pgvector ≥ 0.8) để lọc theo user_id không bị thiếu kết quả.
		index("link_embedding_hnsw_idx").using(
			"hnsw",
			t.embedding.op("vector_cosine_ops"),
		),
	],
);
