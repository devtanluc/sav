import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { plan, subscriptionStatus, usageFeature } from "./enums";
import { createdAt, pkId, timestamptz, updatedAt, userId } from "./helpers";
import { link } from "./link";

/**
 * Trạng thái đăng ký, đồng bộ từ webhook Polar. Nguồn sự thật cho entitlement
 * — KHÔNG tin dữ liệu từ client. Không có bản ghi = gói `free`.
 */
export const subscription = pgTable(
	"subscription",
	{
		id: pkId(),
		/** Một người dùng một subscription (MVP). Đổi gói = cập nhật bản ghi này. */
		userId: userId().unique(),
		plan: plan("plan").default("free").notNull(),
		status: subscriptionStatus("status").default("incomplete").notNull(),
		polarCustomerId: text("polar_customer_id"),
		polarSubscriptionId: text("polar_subscription_id"),
		polarProductId: text("polar_product_id"),
		currentPeriodStart: timestamptz("current_period_start"),
		currentPeriodEnd: timestamptz("current_period_end"),
		cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(t) => [
		uniqueIndex("subscription_polar_subscription_uq").on(t.polarSubscriptionId),
		index("subscription_polar_customer_idx").on(t.polarCustomerId),
	],
);

/** Credit AI theo chu kỳ (tháng/billing period). `included` theo gói, `used` tăng khi tiêu. */
export const creditBalance = pgTable(
	"credit_balance",
	{
		userId: userId(),
		periodStart: timestamptz("period_start").notNull(),
		periodEnd: timestamptz("period_end").notNull(),
		included: integer("included").default(0).notNull(),
		used: integer("used").default(0).notNull(),
		updatedAt: updatedAt(),
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.periodStart] }),
		check("credit_balance_used_nonneg", sql`${t.used} >= 0`),
		check("credit_balance_included_nonneg", sql`${t.included} >= 0`),
	],
);

/** Sổ cái mọi lời gọi AI (mục 5.7). Chỉ ghi thêm, không sửa. */
export const usageLedger = pgTable(
	"usage_ledger",
	{
		id: pkId(),
		userId: userId(),
		feature: usageFeature("feature").notNull(),
		model: text("model"),
		tokensIn: integer("tokens_in").default(0).notNull(),
		tokensOut: integer("tokens_out").default(0).notNull(),
		/** Chi phí ước tính theo micro-USD (1 USD = 1_000_000) để tránh sai số số thực. */
		costMicros: bigint("cost_micros", { mode: "number" }).default(0).notNull(),
		/** Số credit bị trừ cho lần gọi này (0 nếu BYO key). */
		credits: integer("credits").default(0).notNull(),
		/** Người dùng tự mang API key (BYO) → không tính credit. */
		byok: boolean("byok").default(false).notNull(),
		linkId: text("link_id").references(() => link.id, { onDelete: "set null" }),
		requestId: text("request_id"),
		createdAt: createdAt(),
	},
	(t) => [
		index("usage_ledger_user_created_idx").on(
			t.userId,
			t.createdAt.desc().nullsFirst(),
		),
		index("usage_ledger_feature_created_idx").on(
			t.feature,
			t.createdAt.desc().nullsFirst(),
		),
	],
);

/** Chống xử lý trùng webhook (Polar gửi lại). Xử lý xong thì đặt `processed_at`. */
export const webhookEvent = pgTable(
	"webhook_event",
	{
		id: pkId(),
		provider: text("provider").default("polar").notNull(),
		eventId: text("event_id").notNull(),
		type: text("type").notNull(),
		payload: jsonb("payload").$type<unknown>().notNull(),
		receivedAt: timestamptz("received_at").defaultNow().notNull(),
		processedAt: timestamptz("processed_at"),
		error: text("error"),
	},
	(t) => [
		uniqueIndex("webhook_event_provider_event_uq").on(t.provider, t.eventId),
	],
);
