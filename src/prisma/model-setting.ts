import type { ContractHelpers } from "./contract-helpers.ts";
import type { defineEndpointModel } from "./endpoint.ts";
import type { defineUserModel } from "./user.ts";

export function defineModelSettingModel(
	{ field, model, rel }: ContractHelpers,
	{
		User,
		Endpoint,
	}: { User: ReturnType<typeof defineUserModel>; Endpoint: ReturnType<typeof defineEndpointModel> },
) {
	return model("ModelSetting", {
		fields: {
			id: field.id.uuidv7Native(),
			endpointId: field.uuidNative().column("endpoint_id"),
			model: field.text(),
			options: field.json().optional(),
			ownerId: field.uuidNative().column("owner_id"),
			updatedAt: field.temporal.timestamp(3).column("updated_at"),
		},
		relations: {
			endpoint: rel
				.belongsTo(Endpoint, { from: "endpointId", to: "id" })
				.sql({ fk: { onDelete: "cascade", index: false } }),
			owner: rel
				.belongsTo(User, { from: "ownerId", to: "id" })
				.sql({ fk: { onDelete: "cascade", index: false } }),
		},
	}).sql((ctx) => ({
		table: "model_setting",
		indexes: [
			ctx.constraints.index([ctx.cols.endpointId, ctx.cols.model], {
				unique: true,
				map: "model_setting_endpoint_id_model_key",
			}),
		],
	}));
}
