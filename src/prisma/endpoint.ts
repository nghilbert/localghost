import type { ContractHelpers } from "./contract-helpers.ts";
import type { defineUserModel } from "./user.ts";

export function defineEndpointModel(
	{ field, model, rel }: ContractHelpers,
	{ User }: { User: ReturnType<typeof defineUserModel> },
) {
	return model("Endpoint", {
		fields: {
			id: field.id.uuidv7Native(),
			name: field.text(),
			url: field.text(),
			apiKeyEncrypted: field.text().column("api_key_encrypted").optional(),
			provider: field.text().default("openai"),
			options: field.json().optional(),
			ownerId: field.uuidNative().column("owner_id"),
			updatedAt: field.temporal.timestamp(3).column("updated_at"),
			// True only on the machine-managed "llama.cpp (local)" row; null on
			// user-added endpoints, which the unique below therefore never constrains.
			discovered: field.boolean().optional(),
		},
		relations: {
			owner: rel
				.belongsTo(User, { from: "ownerId", to: "id" })
				.sql({ fk: { onDelete: "cascade" } }),
		},
	}).sql((ctx) => ({
		table: "endpoint",
		indexes: [
			ctx.constraints.index([ctx.cols.ownerId, ctx.cols.discovered], {
				unique: true,
				map: "endpoint_owner_id_discovered_key",
			}),
			ctx.constraints.index([ctx.cols.ownerId], { map: "endpoint_owner_id_idx" }),
		],
	}));
}
