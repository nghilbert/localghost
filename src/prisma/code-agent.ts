import type { ContractHelpers } from "./contract-helpers.ts";
import type { defineEndpointModel } from "./endpoint.ts";
import type { defineUserModel } from "./user.ts";

/** A code-agent session: the business record (owner, workspace, endpoint,
 * model). The transcript lives in `ChatThread`, keyed by this row's `id`
 * as `threadId`, the same reuse `Conversation` makes of that table. */
export function defineCodeAgentSessionModel(
	{ field, model, rel }: ContractHelpers,
	{
		User,
		Endpoint,
	}: { User: ReturnType<typeof defineUserModel>; Endpoint: ReturnType<typeof defineEndpointModel> },
) {
	return model("CodeAgentSession", {
		fields: {
			id: field.id.uuidv7Native(),
			ownerId: field.uuidNative().column("owner_id"),
			title: field.text(),
			workspacePath: field.text().column("workspace_path"),
			endpointId: field.uuidNative().column("endpoint_id"),
			harness: field.text(),
			model: field.text(),
			// Commands the user has approved in this session, fed to the sandbox
			// policy's `commands.allow` so an approved command does not ask again
			// on the next turn. Stored as a JSON array: Prisma Next's SQL
			// interpreter rejects native scalar-array (`text[]`) columns.
			approvedCommands: field.json().column("approved_commands"),
			updatedAt: field.temporal.timestamp(3).column("updated_at"),
		},
		relations: {
			owner: rel
				.belongsTo(User, { from: "ownerId", to: "id" })
				.sql({ fk: { onDelete: "cascade" } }),
			endpoint: rel
				.belongsTo(Endpoint, { from: "endpointId", to: "id" })
				.sql({ fk: { onDelete: "cascade", index: false } }),
		},
	}).sql((ctx) => ({
		table: "code_agent_session",
		indexes: [
			ctx.constraints.index([ctx.cols.ownerId], { map: "code_agent_session_owner_id_idx" }),
		],
	}));
}
