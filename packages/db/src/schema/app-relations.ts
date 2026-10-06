import { defineRelationsPart } from "drizzle-orm";
import { apiKey } from "./api-key";
import { user } from "./auth";
import {
	creditBalance,
	subscription,
	usageLedger,
	webhookEvent,
} from "./billing";
import { feed, feedItem } from "./feed";
import { link, linkContent, linkEmbedding, linkEnrichment } from "./link";
import { collection, collectionLink, linkTag, tag } from "./taxonomy";

/**
 * Relations của các bảng ứng dụng.
 *
 * Cố ý KHÔNG khai báo `user.*` ở đây: `authRelations` (auth.ts) đã chiếm khóa `user`, và
 * `relations.ts` gộp các part bằng spread nên khai báo lần hai sẽ ghi đè lần đầu.
 * Mọi truy vấn dữ liệu người dùng đều đi từ bảng con với `where userId = ?` (spec mục 0, quy tắc 3),
 * nên không cần `user.links`, `user.feeds`...
 */
export const appRelations = defineRelationsPart(
	{
		user,
		apiKey,
		link,
		linkContent,
		linkEnrichment,
		linkEmbedding,
		tag,
		linkTag,
		collection,
		collectionLink,
		feed,
		feedItem,
		subscription,
		creditBalance,
		usageLedger,
		webhookEvent,
	},
	(r) => ({
		apiKey: {
			user: r.one.user({ from: r.apiKey.userId, to: r.user.id }),
		},

		link: {
			user: r.one.user({ from: r.link.userId, to: r.user.id }),
			content: r.one.linkContent({ from: r.link.id, to: r.linkContent.linkId }),
			enrichment: r.one.linkEnrichment({
				from: r.link.id,
				to: r.linkEnrichment.linkId,
			}),
			embeddings: r.many.linkEmbedding({
				from: r.link.id,
				to: r.linkEmbedding.linkId,
			}),
			linkTags: r.many.linkTag({ from: r.link.id, to: r.linkTag.linkId }),
			tags: r.many.tag({
				from: r.link.id.through(r.linkTag.linkId),
				to: r.tag.id.through(r.linkTag.tagId),
			}),
			collections: r.many.collection({
				from: r.link.id.through(r.collectionLink.linkId),
				to: r.collection.id.through(r.collectionLink.collectionId),
			}),
			feedItems: r.many.feedItem({ from: r.link.id, to: r.feedItem.linkId }),
		},
		linkContent: {
			link: r.one.link({ from: r.linkContent.linkId, to: r.link.id }),
		},
		linkEnrichment: {
			link: r.one.link({ from: r.linkEnrichment.linkId, to: r.link.id }),
		},
		linkEmbedding: {
			link: r.one.link({ from: r.linkEmbedding.linkId, to: r.link.id }),
		},

		tag: {
			user: r.one.user({ from: r.tag.userId, to: r.user.id }),
			linkTags: r.many.linkTag({ from: r.tag.id, to: r.linkTag.tagId }),
			links: r.many.link({
				from: r.tag.id.through(r.linkTag.tagId),
				to: r.link.id.through(r.linkTag.linkId),
			}),
		},
		linkTag: {
			link: r.one.link({ from: r.linkTag.linkId, to: r.link.id }),
			tag: r.one.tag({ from: r.linkTag.tagId, to: r.tag.id }),
		},

		collection: {
			user: r.one.user({ from: r.collection.userId, to: r.user.id }),
			collectionLinks: r.many.collectionLink({
				from: r.collection.id,
				to: r.collectionLink.collectionId,
			}),
			links: r.many.link({
				from: r.collection.id.through(r.collectionLink.collectionId),
				to: r.link.id.through(r.collectionLink.linkId),
			}),
		},
		collectionLink: {
			collection: r.one.collection({
				from: r.collectionLink.collectionId,
				to: r.collection.id,
			}),
			link: r.one.link({ from: r.collectionLink.linkId, to: r.link.id }),
		},

		feed: {
			user: r.one.user({ from: r.feed.userId, to: r.user.id }),
			items: r.many.feedItem({ from: r.feed.id, to: r.feedItem.feedId }),
		},
		feedItem: {
			user: r.one.user({ from: r.feedItem.userId, to: r.user.id }),
			feed: r.one.feed({ from: r.feedItem.feedId, to: r.feed.id }),
			link: r.one.link({
				from: r.feedItem.linkId,
				to: r.link.id,
				optional: true,
			}),
		},

		subscription: {
			user: r.one.user({ from: r.subscription.userId, to: r.user.id }),
		},
		creditBalance: {
			user: r.one.user({ from: r.creditBalance.userId, to: r.user.id }),
		},
		usageLedger: {
			user: r.one.user({ from: r.usageLedger.userId, to: r.user.id }),
			link: r.one.link({
				from: r.usageLedger.linkId,
				to: r.link.id,
				optional: true,
			}),
		},
	}),
);
