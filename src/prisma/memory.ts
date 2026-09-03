import type { ContractHelpers } from "./contract-helpers.ts";
import type { defineUserModel } from "./user.ts";

export function defineMemoryModel(
	{ field, model, rel }: ContractHelpers,
	{ User }: { User: ReturnType<typeof defineUserModel> },
) {
	return model("Memory", {
		fields: {
			id: field.id.uuidv7Native(),
			text: field.text(),
			// `embedding` (pgvector, unsized) is deliberately absent: Prisma Next
			// has no `Unsupported(...)` escape hatch, and providers disagree on
			// embedding dimension, so it stays raw-SQL-only (memory.server.ts).
			category: field.text().default("fact"),
			// Where this memory came from: "user" (manually added), "agent"
			// (extracted during a chat), etc.
			source: field.text().default("user"),
			ownerId: field.uuidNative().column("owner_id"),
		},
		relations: {
			owner: rel
				.belongsTo(User, { from: "ownerId", to: "id" })
				.sql({ fk: { onDelete: "cascade" } }),
		},
	}).sql((ctx) => ({
		table: "memory",
		indexes: [ctx.constraints.index([ctx.cols.ownerId], { map: "memory_owner_id_idx" })],
	}));
}
