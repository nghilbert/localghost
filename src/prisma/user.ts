import type { ContractHelpers } from "./contract-helpers.ts";

export function defineUserModel({ field, model }: ContractHelpers) {
	return model("User", {
		fields: {
			id: field.id.uuidv7Native(),
			name: field.text(),
			email: field.text(),
			emailVerified: field.boolean().column("email_verified").default(false),
			image: field.text().optional(),
			// Chat defaults, declared as better-auth `user.additionalFields`.
			systemPrompt: field.text().column("system_prompt").optional(),
			temperature: field.float().optional(),
			createdAt: field.temporal.timestamp(3).defaultSql("now()").column("created_at"),
			updatedAt: field.temporal.timestamp(3).column("updated_at"),
		},
	}).sql((ctx) => ({
		table: "user",
		indexes: [ctx.constraints.index([ctx.cols.email], { unique: true, map: "user_email_key" })],
	}));
}
