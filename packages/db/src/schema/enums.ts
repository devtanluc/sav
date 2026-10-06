import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Thêm giá trị enum sau này: `ALTER TYPE ... ADD VALUE` (an toàn, backward-compatible).
 * Xóa/đổi tên giá trị enum rất khó trong Postgres → chỉ đưa vào đây những tập giá trị ổn định.
 */

/** Trạng thái trích xuất nội dung (pipeline mục 5.4 của spec). */
export const linkStatus = pgEnum("link_status", ["pending", "ready", "failed"]);

/** Trạng thái đọc của người dùng. Xóa mềm dùng cột `deleted_at`, không nằm ở đây. */
export const linkState = pgEnum("link_state", ["unread", "read", "archived"]);

/** Link đến từ đâu. */
export const linkSource = pgEnum("link_source", [
	"manual",
	"extension",
	"api",
	"feed",
	"email",
	"x",
	"import",
]);

/** Tag do người dùng hay AI gán. */
export const tagSource = pgEnum("tag_source", ["user", "ai"]);

export const feedKind = pgEnum("feed_kind", ["rss", "youtube"]);

export const feedItemState = pgEnum("feed_item_state", [
	"unread",
	"read",
	"dismissed",
	"saved",
]);

export const plan = pgEnum("plan", ["free", "plus", "pro", "team"]);

/** Khớp với trạng thái subscription của Polar. */
export const subscriptionStatus = pgEnum("subscription_status", [
	"incomplete",
	"incomplete_expired",
	"trialing",
	"active",
	"past_due",
	"canceled",
	"unpaid",
]);

/** Tính năng bị đo đếm trong usage ledger / AI gateway (mục 5.7). */
export const usageFeature = pgEnum("usage_feature", [
	"summary",
	"auto_tag",
	"embedding",
	"chat",
	"search_rewrite",
	"transcript",
	"pdf_extract",
	"digest",
]);
