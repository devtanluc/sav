import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { feedItemState, feedKind } from "./enums";
import { createdAt, pkId, timestamptz, updatedAt, userId } from "./helpers";
import { link } from "./link";

export const feed = pgTable(
	"feed",
	{
		id: pkId(),
		userId: userId(),

		/** URL của feed (đã discover/chuẩn hóa). */
		url: text("url").notNull(),
		/** Trang chủ của site, nếu biết. */
		siteUrl: text("site_url"),
		kind: feedKind("kind").default("rss").notNull(),
		title: text("title"),
		iconUrl: text("icon_url"),

		// Conditional GET.
		etag: text("etag"),
		lastModified: text("last_modified"),

		lastSyncedAt: timestamptz("last_synced_at"),
		/** Scheduler lấy các feed `active` có `next_sync_at <= now()`. */
		nextSyncAt: timestamptz("next_sync_at").defaultNow().notNull(),
		/** Chu kỳ sync thích ứng: tăng khi feed ít cập nhật, giảm khi nhiều. */
		syncIntervalSeconds: integer("sync_interval_seconds")
			.default(3600)
			.notNull(),
		errorCount: integer("error_count").default(0).notNull(),
		lastError: text("last_error"),
		active: boolean("active").default(true).notNull(),

		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(t) => [
		uniqueIndex("feed_user_url_uq").on(t.userId, t.url),
		index("feed_due_idx").on(t.nextSyncAt).where(sql`active = true`),
	],
);

export const feedItem = pgTable(
	"feed_item",
	{
		id: pkId(),
		feedId: text("feed_id")
			.notNull()
			.references(() => feed.id, { onDelete: "cascade" }),
		userId: userId(),

		/** GUID của mục trong feed (fallback: URL/hash) — khóa dedupe trong một feed. */
		guid: text("guid").notNull(),
		url: text("url").notNull(),
		title: text("title"),
		author: text("author"),
		/** Đoạn tóm tắt/nội dung ngắn từ chính feed. */
		summary: text("summary"),
		imageUrl: text("image_url"),
		publishedAt: timestamptz("published_at"),

		state: feedItemState("state").default("unread").notNull(),
		/** Khi "giữ lại", trỏ tới link đã tạo. Link bị xóa cứng thì giữ lại feed item. */
		linkId: text("link_id").references(() => link.id, { onDelete: "set null" }),

		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(t) => [
		uniqueIndex("feed_item_feed_guid_uq").on(t.feedId, t.guid),
		// Inbox hợp nhất: mục mới nhất của người dùng.
		index("feed_item_user_published_idx").on(
			t.userId,
			t.publishedAt.desc().nullsFirst(),
			t.id.desc().nullsFirst(),
		),
		index("feed_item_user_state_idx").on(
			t.userId,
			t.state,
			t.publishedAt.desc().nullsFirst(),
		),
		index("feed_item_link_idx").on(t.linkId),
	],
);
