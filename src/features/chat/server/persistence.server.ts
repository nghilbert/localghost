import type { ModelMessage, RunRecord, RunStatus, RunStore } from "@tanstack/ai";
import type {
	ChatWithInterruptsPersistence,
	InterruptRecord,
	InterruptStatus,
	InterruptStore,
	MessageStore,
} from "@tanstack/ai-persistence";
import { defineAIPersistence } from "@tanstack/ai-persistence";
import { reviveMessageDates } from "#/features/chat/lib/messages";
import { prisma } from "#/lib/db.server";

const RUN_STATUSES: ReadonlyArray<RunStatus> = [
	"running",
	"interrupted",
	"completed",
	"failed",
	"aborted",
];
const INTERRUPT_STATUSES: ReadonlyArray<InterruptStatus> = ["pending", "resolved", "cancelled"];

/** Narrows the stored string, throwing on an unknown value. */
function toRunStatus(value: string): RunStatus {
	const status = RUN_STATUSES.find((candidate) => candidate === value);
	if (!status) throw new Error(`Unknown run status: ${value}`);
	return status;
}

function toInterruptStatus(value: string): InterruptStatus {
	const status = INTERRUPT_STATUSES.find((candidate) => candidate === value);
	if (!status) throw new Error(`Unknown interrupt status: ${value}`);
	return status;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Checks the three counts `TokenUsage` requires; its other fields are optional. */
function isTokenUsage(value: unknown): value is NonNullable<RunRecord["usage"]> {
	return (
		isJsonObject(value) &&
		typeof value.promptTokens === "number" &&
		typeof value.completionTokens === "number" &&
		typeof value.totalTokens === "number"
	);
}

function mapRun(row: {
	runId: string;
	threadId: string;
	status: string;
	startedAt: bigint;
	finishedAt: bigint | null;
	error: string | null;
	errorCode: string | null;
	usage: unknown;
	sandboxKey: string | null;
	detachedSince: bigint | null;
	cancelRequested: boolean | null;
	driverEpoch: number | null;
}): RunRecord {
	return {
		runId: row.runId,
		threadId: row.threadId,
		status: toRunStatus(row.status),
		startedAt: Number(row.startedAt),
		...(row.finishedAt != null ? { finishedAt: Number(row.finishedAt) } : {}),
		...(row.error != null
			? { error: { message: row.error, ...(row.errorCode != null ? { code: row.errorCode } : {}) } }
			: {}),
		...(isTokenUsage(row.usage) ? { usage: row.usage } : {}),
		...(row.sandboxKey != null ? { sandboxKey: row.sandboxKey } : {}),
		...(row.detachedSince != null ? { detachedSince: Number(row.detachedSince) } : {}),
		...(row.cancelRequested != null ? { cancelRequested: row.cancelRequested } : {}),
		...(row.driverEpoch != null ? { driverEpoch: row.driverEpoch } : {}),
	};
}

function mapInterrupt(row: {
	interruptId: string;
	runId: string;
	threadId: string;
	status: string;
	requestedAt: bigint;
	resolvedAt: bigint | null;
	payload: unknown;
	response: unknown;
}): InterruptRecord {
	return {
		interruptId: row.interruptId,
		runId: row.runId,
		threadId: row.threadId,
		status: toInterruptStatus(row.status),
		requestedAt: Number(row.requestedAt),
		payload: isJsonObject(row.payload) ? row.payload : {},
		...(row.resolvedAt != null ? { resolvedAt: Number(row.resolvedAt) } : {}),
		...(row.response !== null && row.response !== undefined ? { response: row.response } : {}),
	};
}

function createMessageStore(): MessageStore {
	return {
		async loadThread(threadId) {
			const row = await prisma.chatThread.findUnique({
				where: { threadId },
				select: { messages: true },
			});
			// The store contract returns [] for an unknown thread.
			if (!row) return [];
			const stored: Array<ModelMessage> = JSON.parse(JSON.stringify(row.messages));
			return reviveMessageDates(stored);
		},
		// `messages` is the whole transcript. The store must be able to create a thread,
		// which is why this table has no owner column.
		async saveThread(threadId, messages) {
			const data = { messages: JSON.parse(JSON.stringify(messages)) };
			await prisma.chatThread.upsert({
				where: { threadId },
				create: { threadId, ...data },
				update: data,
			});
		},
	};
}

function createRunStore(): RunStore {
	return {
		async get(runId) {
			const row = await prisma.chatRun.findUnique({ where: { runId } });
			return row ? mapRun(row) : null;
		},
		// An empty `update` inserts only when absent, so an existing run comes back unchanged.
		async createOrResume({ runId, threadId, startedAt, status }) {
			const row = await prisma.chatRun.upsert({
				where: { runId },
				create: { runId, threadId, status: status ?? "running", startedAt: BigInt(startedAt) },
				update: {},
			});
			return mapRun(row);
		},
		// An unknown run is ignored.
		async update(runId, patch) {
			const data: Record<string, unknown> = {};
			if (patch.status !== undefined) data.status = patch.status;
			if (patch.finishedAt !== undefined) data.finishedAt = BigInt(patch.finishedAt);
			// Written together, so an error without a code clears the previous code.
			if (patch.error !== undefined) {
				data.error = patch.error.message;
				data.errorCode = patch.error.code ?? null;
			}
			if (patch.usage !== undefined) data.usage = patch.usage;
			// These use `in`, since passing `undefined` explicitly clears the column.
			if ("sandboxKey" in patch) data.sandboxKey = patch.sandboxKey ?? null;
			if ("detachedSince" in patch) {
				data.detachedSince = patch.detachedSince === undefined ? null : BigInt(patch.detachedSince);
			}
			if ("cancelRequested" in patch) data.cancelRequested = patch.cancelRequested ?? null;
			if ("driverEpoch" in patch) data.driverEpoch = patch.driverEpoch ?? null;
			if (Object.keys(data).length === 0) return;
			await prisma.chatRun.updateMany({ where: { runId }, data });
		},
		async findActiveRun(threadId) {
			const row = await prisma.chatRun.findFirst({
				where: { threadId, status: "running" },
				orderBy: { startedAt: "desc" },
			});
			return row ? mapRun(row) : null;
		},
		async listByThread(threadId) {
			const rows = await prisma.chatRun.findMany({
				where: { threadId },
				orderBy: { startedAt: "asc" },
			});
			return rows.map(mapRun);
		},
		async listReclaimable({ now, ttlMs }) {
			const cutoff = BigInt(now - ttlMs);
			const rows = await prisma.chatRun.findMany({
				where: { status: "running", detachedSince: { not: null, lte: cutoff } },
			});
			return rows.map(mapRun);
		},
	};
}

function createInterruptStore(): InterruptStore {
	const listWhere = async (where: { threadId?: string; runId?: string; status?: string }) => {
		const rows = await prisma.chatInterrupt.findMany({ where, orderBy: { requestedAt: "asc" } });
		return rows.map(mapInterrupt);
	};

	return {
		// Inserts only when absent, so a repeat never resets a resolved interrupt to pending.
		async create(record) {
			await prisma.chatInterrupt.upsert({
				where: { interruptId: record.interruptId },
				create: {
					interruptId: record.interruptId,
					runId: record.runId,
					threadId: record.threadId,
					status: "pending",
					requestedAt: BigInt(record.requestedAt),
					payload: JSON.parse(JSON.stringify(record.payload)),
					...(record.response !== undefined
						? { response: JSON.parse(JSON.stringify(record.response)) }
						: {}),
				},
				update: {},
			});
		},
		async resolve(interruptId, response) {
			await prisma.chatInterrupt.updateMany({
				where: { interruptId },
				data: {
					status: "resolved",
					resolvedAt: BigInt(Date.now()),
					...(response !== undefined ? { response: JSON.parse(JSON.stringify(response)) } : {}),
				},
			});
		},
		async cancel(interruptId) {
			await prisma.chatInterrupt.updateMany({
				where: { interruptId },
				data: { status: "cancelled", resolvedAt: BigInt(Date.now()) },
			});
		},
		async get(interruptId) {
			const row = await prisma.chatInterrupt.findUnique({ where: { interruptId } });
			return row ? mapInterrupt(row) : null;
		},
		list: (threadId) => listWhere({ threadId }),
		listPending: (threadId) => listWhere({ threadId, status: "pending" }),
		listByRun: (runId) => listWhere({ runId }),
		listPendingByRun: (runId) => listWhere({ runId, status: "pending" }),
	};
}

/** Chat persistence for `withPersistence`: transcripts in `ChatThread`, runs in `ChatRun`, interrupts in `ChatInterrupt`. */
export const chatPersistence: ChatWithInterruptsPersistence = defineAIPersistence({
	stores: {
		messages: createMessageStore(),
		runs: createRunStore(),
		interrupts: createInterruptStore(),
	},
});

/** The thread a run belongs to, or `null` for an unknown run. Used to authorize requests that name only a run. */
export async function findRunThreadId({ runId }: { runId: string }): Promise<string | null> {
	const run = await chatPersistence.stores.runs.get(runId);
	return run?.threadId ?? null;
}
