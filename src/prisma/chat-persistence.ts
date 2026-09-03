import type { ContractHelpers } from "./contract-helpers.ts";

/** The transcript `withPersistence` reads/writes, keyed by `threadId` (our
 * `Conversation.id`, stored as a bare string). `saveThread` is an upsert,
 * so this cannot require an owner the way `Conversation` does. App code
 * joins the two tables on `id`/`threadId` itself. */
export function defineChatThreadModel({ field, model }: ContractHelpers) {
	return model("ChatThread", {
		fields: {
			threadId: field.text().id().column("thread_id"),
			messages: field.json(),
			updatedAt: field.temporal.timestamp(3).column("updated_at"),
		},
	}).sql({ table: "chat_thread" });
}

/** Run and interrupt state for `@tanstack/ai-persistence`'s `withPersistence`.
 * `runId`/`interruptId` are minted by the library, not UUID-shaped. No
 * relation to `Conversation`/`ChatThread`: the package's conformance testkit
 * writes synthetic thread/run ids that were never created as rows. */
export function defineChatRunModel({ field, model }: ContractHelpers) {
	return model("ChatRun", {
		fields: {
			runId: field.text().id().column("run_id"),
			threadId: field.text().column("thread_id"),
			status: field.text(),
			startedAt: field.bigint().column("started_at"),
			finishedAt: field.bigint().column("finished_at").optional(),
			error: field.text().optional(),
			errorCode: field.text().column("error_code").optional(),
			usage: field.json().optional(),
			sandboxKey: field.text().column("sandbox_key").optional(),
			detachedSince: field.bigint().column("detached_since").optional(),
			cancelRequested: field.boolean().column("cancel_requested").optional(),
			driverEpoch: field.int().column("driver_epoch").optional(),
		},
	}).sql((ctx) => ({
		table: "chat_run",
		indexes: [
			ctx.constraints.index([ctx.cols.threadId, ctx.cols.status], {
				map: "chat_run_thread_id_status_idx",
			}),
			ctx.constraints.index([ctx.cols.threadId, ctx.cols.startedAt], {
				map: "chat_run_thread_id_started_at_idx",
			}),
			// Powers listReclaimable: status = 'running' AND detachedSince <= cutoff.
			ctx.constraints.index([ctx.cols.status, ctx.cols.detachedSince], {
				map: "chat_run_status_detached_since_idx",
			}),
		],
	}));
}

export function defineChatInterruptModel({ field, model }: ContractHelpers) {
	return model("ChatInterrupt", {
		fields: {
			interruptId: field.text().id().column("interrupt_id"),
			runId: field.text().column("run_id"),
			threadId: field.text().column("thread_id"),
			status: field.text(),
			requestedAt: field.bigint().column("requested_at"),
			resolvedAt: field.bigint().column("resolved_at").optional(),
			payload: field.json(),
			response: field.json().optional(),
		},
	}).sql((ctx) => ({
		table: "chat_interrupt",
		indexes: [
			ctx.constraints.index([ctx.cols.threadId, ctx.cols.requestedAt], {
				map: "chat_interrupt_thread_id_requested_at_idx",
			}),
			ctx.constraints.index([ctx.cols.runId, ctx.cols.requestedAt], {
				map: "chat_interrupt_run_id_requested_at_idx",
			}),
		],
	}));
}
