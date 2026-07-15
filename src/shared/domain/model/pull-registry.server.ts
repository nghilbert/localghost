/**
 * In-memory registry of in-flight Ollama pulls; clients poll {@link listActivePulls},
 * cancel via {@link cancelPull}. Compose runs one server, so no shared store. Pulls
 * also persist to the database so {@link resumeOrphanedPulls} can re-attach after a restart.
 */

import { prisma } from "#/shared/lib/db.server";
import { ollamaClient } from "#/shared/lib/ollama/client.server";

/** Live progress for one model pull, as exposed to clients. */
export type PullSnapshot = {
	model: string;
	status: string;
	completed?: number;
	total?: number;
	error?: string;
	/** Smoothed download throughput in bytes per second, while bytes are flowing. */
	bytesPerSec?: number;
	/** True once the pull reached a terminal state (success or error). */
	done: boolean;
};

type PullEntry = {
	status: string;
	completed?: number;
	total?: number;
	error?: string;
	bytesPerSec?: number;
	done: boolean;
	doneAt?: number;
	/** Stops the in-flight pull stream; a no-op until the stream exists. */
	abort: () => void;
	/** True once cancellation was requested, so the driver tears down instead of reporting an error. */
	canceled: boolean;
	/** Start of the current averaging window. Ollama reports `completed` per layer,
	 *  so the window restarts whenever a new layer begins. */
	windowAt?: number;
	windowCompleted?: number;
	lastCompleted?: number;
};

/** How long a finished pull lingers so a client can observe its terminal state. */
const DONE_TTL_MS = 30_000;

const pulls = new Map<string, PullEntry>();
const keyFor = ({ userId, model }: { userId: string; model: string }) => `${userId}:${model}`;

/**
 * Begin downloading a model, or no-op if a pull for the same user+model is
 * already running (a caller returning to the page attaches to the live pull
 * rather than starting a second download).
 */
export async function startPull({
	userId,
	model,
	ollamaUrl,
}: {
	userId: string;
	model: string;
	ollamaUrl: string;
}): Promise<void> {
	const key = keyFor({ userId, model });
	const existing = pulls.get(key);
	if (existing && !existing.done) return;

	const entry: PullEntry = { status: "Starting…", done: false, abort: () => {}, canceled: false };
	pulls.set(key, entry);
	try {
		// Persist before driving so a restart mid-download can resume this pull.
		await prisma.ollamaPull.upsert({
			where: { ownerId_model: { ownerId: userId, model } },
			create: { ownerId: userId, model, ollamaUrl },
			update: { ollamaUrl },
		});
	} catch (error) {
		console.error("Failed to persist a pull record; it won't resume after a restart", {
			model,
			error,
		});
	}
	void drivePull({ key, entry, model, ollamaUrl, userId });
}

/**
 * Restarts pulls persisted as in-flight but missing from the registry (a
 * restart wiped it). Ollama caches completed layers, so re-issuing the same
 * pull resumes the remaining download instead of starting over.
 */
export async function resumeOrphanedPulls(userId: string): Promise<void> {
	const prefix = `${userId}:`;
	for (const key of pulls.keys()) {
		// Any live entry means the registry survived; nothing was orphaned.
		if (key.startsWith(prefix)) return;
	}
	const rows = await prisma.ollamaPull.findMany({ where: { ownerId: userId } });
	for (const row of rows) {
		await startPull({ userId, model: row.model, ollamaUrl: row.ollamaUrl });
	}
}

/** Drops the persisted record once a pull is no longer worth resuming. */
async function forgetPull({ userId, model }: { userId: string; model: string }): Promise<void> {
	try {
		await prisma.ollamaPull.deleteMany({ where: { ownerId: userId, model } });
	} catch (error) {
		console.error("Failed to clear a persisted pull record", { model, error });
	}
}

/**
 * Abort an in-flight pull (the download stops and the entry is dropped), or
 * drop an already-finished entry so a client can dismiss a failed pull.
 */
export function cancelPull({ userId, model }: { userId: string; model: string }): void {
	const key = keyFor({ userId, model });
	const entry = pulls.get(key);
	if (!entry) return;
	if (entry.done) {
		pulls.delete(key);
		return;
	}
	entry.canceled = true;
	entry.abort();
}

/**
 * Live snapshots of the user's pulls, including recently finished ones (so the
 * client can fire a completion toast) until they age out.
 */
export function listActivePulls(userId: string): PullSnapshot[] {
	const prefix = `${userId}:`;
	const now = Date.now();
	const snapshots: PullSnapshot[] = [];

	for (const [key, entry] of pulls) {
		if (!key.startsWith(prefix)) continue;
		if (entry.done && entry.doneAt && now - entry.doneAt > DONE_TTL_MS) {
			pulls.delete(key);
			continue;
		}
		snapshots.push({
			model: key.slice(prefix.length),
			status: entry.status,
			completed: entry.completed,
			total: entry.total,
			error: entry.error,
			bytesPerSec: entry.bytesPerSec,
			done: entry.done,
		});
	}

	return snapshots;
}

/** Streams the SDK's pull progress into the registry entry until it ends. */
async function drivePull({
	key,
	entry,
	model,
	ollamaUrl,
	userId,
}: {
	key: string;
	entry: PullEntry;
	model: string;
	ollamaUrl: string;
	userId: string;
}): Promise<void> {
	try {
		const stream = await ollamaClient({ host: ollamaUrl }).pull({ model, stream: true });
		// Cancellation may arrive before the stream resolves; honor it, then wire it up.
		if (entry.canceled) {
			stream.abort();
			pulls.delete(key);
			return;
		}
		entry.abort = () => stream.abort();

		for await (const part of stream) {
			if (part.status === "success") return finish({ entry, terminal: { status: "success" } });
			entry.status = part.status || "Downloading…";
			entry.completed = part.completed;
			entry.total = part.total;
			updateRate({ entry, completed: part.completed });
		}
		finish({ entry, terminal: { status: "success" } });
	} catch (err) {
		if (entry.canceled) {
			pulls.delete(key); // user stopped; drop immediately, nothing to report
			return;
		}
		finish({
			entry,
			terminal: { status: "Error", error: err instanceof Error ? err.message : "Pull failed" },
		});
	} finally {
		// Every exit is terminal (success, error, or cancel): stop resuming it.
		void forgetPull({ userId, model });
	}
}

/**
 * Throughput averaged over the current layer: bytes since the window opened
 * over elapsed time. Ollama reports `completed` per layer, so a decrease means
 * a new layer started and the window restarts there.
 */
function updateRate({
	entry,
	completed,
}: {
	entry: PullEntry;
	completed: number | undefined;
}): void {
	if (completed === undefined) return;
	const now = Date.now();
	if (entry.windowAt === undefined || completed < (entry.lastCompleted ?? 0)) {
		entry.windowAt = now;
		entry.windowCompleted = completed;
	}
	entry.lastCompleted = completed;
	const secs = (now - entry.windowAt) / 1000;
	if (secs > 0) entry.bytesPerSec = (completed - (entry.windowCompleted ?? 0)) / secs;
}

function finish({
	entry,
	terminal,
}: {
	entry: PullEntry;
	terminal: { status: string; error?: string };
}): void {
	entry.status = terminal.status;
	entry.error = terminal.error;
	entry.done = true;
	entry.doneAt = Date.now();
}
