import type { ContractHelpers } from "./contract-helpers.ts";
import type { defineUserModel } from "./user.ts";

export function defineAccountModel(
	{ field, model, rel }: ContractHelpers,
	{ User }: { User: ReturnType<typeof defineUserModel> },
) {
	return model("Account", {
		fields: {
			id: field.id.uuidv7Native(),
			issuer: field.text(),
			accountId: field.text().column("account_id"),
			providerId: field.text().column("provider_id"),
			userId: field.uuidNative().column("user_id"),
			accessToken: field.text().column("access_token").optional(),
			refreshToken: field.text().column("refresh_token").optional(),
			idToken: field.text().column("id_token").optional(),
			accessTokenExpiresAt: field.temporal
				.timestamp(3)
				.column("access_token_expires_at")
				.optional(),
			refreshTokenExpiresAt: field.temporal
				.timestamp(3)
				.column("refresh_token_expires_at")
				.optional(),
			scope: field.text().optional(),
			password: field.text().optional(),
			createdAt: field.temporal.timestamp(3).defaultSql("now()").column("created_at"),
			updatedAt: field.temporal.timestamp(3).column("updated_at"),
		},
		relations: {
			user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
		},
	}).sql((ctx) => ({
		table: "account",
		indexes: [
			ctx.constraints.index([ctx.cols.issuer, ctx.cols.accountId], {
				unique: true,
				map: "account_issuer_accountId_uidx",
			}),
			ctx.constraints.index([ctx.cols.userId], { map: "account_user_id_idx" }),
		],
	}));
}
