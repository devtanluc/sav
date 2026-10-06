import { customType, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Số chiều vector embedding. Phải khớp với model embedding đang dùng
 * (1536 = text-embedding-3-small và nhiều model tương đương).
 * Đổi model/số chiều = migration + re-embed toàn bộ, nên chốt sớm.
 * pgvector HNSW hỗ trợ tối đa 2000 chiều với kiểu `vector`.
 */
export const EMBEDDING_DIMENSIONS = 1536;

export const newId = () => crypto.randomUUID();

/** Khóa chính dạng text (cùng kiểu với bảng Better Auth). */
export const pkId = () => text("id").primaryKey().$defaultFn(newId);

/** FK tới user. Mọi bảng dữ liệu người dùng đều có cột này (xem spec mục 6). */
export const userId = () =>
	text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" });

export const createdAt = () =>
	timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const updatedAt = () =>
	timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull();

export const timestamptz = (name: string) =>
	timestamp(name, { withTimezone: true });

/** Kiểu tsvector của Postgres (Drizzle chưa có sẵn). */
export const tsvector = customType<{ data: string }>({
	dataType() {
		return "tsvector";
	},
});
