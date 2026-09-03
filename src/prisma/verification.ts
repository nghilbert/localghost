import type { ContractHelpers } from "./contract-helpers.ts";

export function defineVerificationModel({ field, model }: ContractHelpers) {
	return model("Verification", {
		fields: {
			id: field.id.uuidv7Native(),
			identifier: field.text(),
			value: field.text(),
			expiresAt: field.temporal.timestamp(3).column("expires_at"),
			createdAt: field.temporal.timestamp(3).defaultSql("now()").column("created_at"),
			updatedAt: field.temporal.timestamp(3).column("updated_at"),
		},
	}).sql((ctx) => ({
		table: "verification",
		indexes: [ctx.constraints.index([ctx.cols.identifier], { map: "verification_identifier_idx" })],
	}));
}
