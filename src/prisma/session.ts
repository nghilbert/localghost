import type { ContractHelpers } from "./contract-helpers.ts";
import type { defineUserModel } from "./user.ts";

export function defineSessionModel(
	{ field, model, rel }: ContractHelpers,
	{ User }: { User: ReturnType<typeof defineUserModel> },
) {
	return model("Session", {
		fields: {
			id: field.id.uuidv7Native(),
			expiresAt: field.temporal.timestamp(3).column("expires_at"),
			token: field.text(),
			createdAt: field.temporal.timestamp(3).defaultSql("now()").column("created_at"),
			updatedAt: field.temporal.timestamp(3).column("updated_at"),
			ipAddress: field.text().column("ip_address").optional(),
			userAgent: field.text().column("user_agent").optional(),
			userId: field.uuidNative().column("user_id"),
		},
		relations: {
			user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
		},
	}).sql((ctx) => ({
		table: "session",
		indexes: [
			ctx.constraints.index([ctx.cols.token], { unique: true, map: "session_token_key" }),
			ctx.constraints.index([ctx.cols.userId], { map: "session_user_id_idx" }),
		],
	}));
}
