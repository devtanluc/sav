import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { createdAt, pkId, timestamptz, userId } from "./helpers";

/**
 * API key cho REST /v1, CLI và MCP (spec mục 5.6).
 * - Key dạng `san_<random>`; chỉ hiển thị MỘT lần khi tạo, DB chỉ lưu `hash` (SHA-256).
 * - `prefix` (vài ký tự đầu) để người dùng nhận ra key trong UI.
 * - `scopes`: "read" | "write" (validate bằng zod ở tầng service).
 *
 * Lưu ý: nếu sau này dùng plugin API key của Better Auth, plugin đó tạo bảng `apikey` riêng.
 * Chọn MỘT trong hai để tránh trùng lặp.
 */
export const apiKey = pgTable(
	"api_key",
	{
		id: pkId(),
		userId: userId(),
		name: text("name").notNull(),
		prefix: text("prefix").notNull(),
		hash: text("hash").notNull(),
		scopes: text("scopes").array().notNull().default(["read"]),
		lastUsedAt: timestamptz("last_used_at"),
		expiresAt: timestamptz("expires_at"),
		revokedAt: timestamptz("revoked_at"),
		createdAt: createdAt(),
	},
	(t) => [
		uniqueIndex("api_key_hash_uq").on(t.hash),
		index("api_key_user_idx").on(t.userId),
	],
);
