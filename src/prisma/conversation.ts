import type { ContractHelpers } from "./contract-helpers.ts";
import type { defineEndpointModel } from "./endpoint.ts";
import type { defineUserModel } from "./user.ts";

/** A chat conversation: the business record (owner, model, title). The
 * transcript lives in `ChatThread`, keyed by this row's `id` as `threadId`. */
export function defineConversationModel(
	{ field, model, rel }: ContractHelpers,
	{
		User,
		Endpoint,
	}: { User: ReturnType<typeof defineUserModel>; Endpoint: ReturnType<typeof defineEndpointModel> },
) {
	return model("Conversation", {
		fields: {
			id: field.id.uuidv7Native(),
			ownerId: field.uuidNative().column("owner_id"),
			title: field.text().default("New Chat"),
			endpointId: field.uuidNative().column("endpoint_id").optional(),
			model: field.text().optional(),
			updatedAt: field.temporal.timestamp(3).column("updated_at"),
		},
		relations: {
			owner: rel
				.belongsTo(User, { from: "ownerId", to: "id" })
				.sql({ fk: { onDelete: "cascade" } }),
			endpoint: rel
				.belongsTo(Endpoint, { from: "endpointId", to: "id" })
				.sql({ fk: { onDelete: "setNull", index: false } }),
		},
	}).sql((ctx) => ({
		table: "conversation",
		indexes: [ctx.constraints.index([ctx.cols.ownerId], { map: "conversation_owner_id_idx" })],
	}));
}
