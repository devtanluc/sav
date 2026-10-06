import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { tagSource } from "./enums";
import { createdAt, pkId, updatedAt, userId } from "./helpers";
import { link } from "./link";

export const tag = pgTable(
	"tag",
	{
		id: pkId(),
		userId: userId(),
		name: text("name").notNull(),
		createdAt: createdAt(),
	},
	(t) => [
		// Không phân biệt hoa/thường trong phạm vi một người dùng.
		uniqueIndex("tag_user_name_uq").on(t.userId, sql`lower(${t.name})`),
	],
);

export const linkTag = pgTable(
	"link_tag",
	{
		linkId: text("link_id")
			.notNull()
			.references(() => link.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => tag.id, { onDelete: "cascade" }),
		userId: userId(),
		source: tagSource("source").default("user").notNull(),
		createdAt: createdAt(),
	},
	(t) => [
		primaryKey({ columns: [t.linkId, t.tagId] }),
		index("link_tag_tag_idx").on(t.tagId),
		index("link_tag_user_idx").on(t.userId),
	],
);

/** Collection phẳng (không lồng nhau) theo spec MVP. */
export const collection = pgTable(
	"collection",
	{
		id: pkId(),
		userId: userId(),
		name: text("name").notNull(),
		description: text("description"),
		position: integer("position").default(0).notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(t) => [
		uniqueIndex("collection_user_name_uq").on(t.userId, sql`lower(${t.name})`),
		index("collection_user_position_idx").on(t.userId, t.position),
	],
);

export const collectionLink = pgTable(
	"collection_link",
	{
		collectionId: text("collection_id")
			.notNull()
			.references(() => collection.id, { onDelete: "cascade" }),
		linkId: text("link_id")
			.notNull()
			.references(() => link.id, { onDelete: "cascade" }),
		userId: userId(),
		position: integer("position").default(0).notNull(),
		addedAt: timestamp("added_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		primaryKey({ columns: [t.collectionId, t.linkId] }),
		index("collection_link_link_idx").on(t.linkId),
		index("collection_link_user_idx").on(t.userId),
	],
);
