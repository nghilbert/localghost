/**
 * Live view of in-flight llama.cpp downloads, sourced from the router's
 * `/models/sse` stream. llama-server owns the download itself — it survives
 * our process restarting — so unlike the old Ollama-based pull registry, there is
 * nothing here to persist or resume: on restart we just resubscribe to the
 * SSE stream and observe whatever is already in flight.
 */

import {
	downloadModel,
	type ModelStateEvent,
	unloadModel,
	watchModels,
} from "#/shared/lib/llamacpp/client.server";

/** Live progress for one model download, as exposed to clients. */
export type DownloadSnapshot = {
	model: string;
	status: string;
	completed?: number;
	total?: number;
	error?: string;
	/** Smoothed download throughput in bytes per second, while bytes are flowing. */
	bytesPerSec?: number;
	/** True once the download reached a terminal state (success or error). */
	done: boolean;
};

type DownloadEntry = {
	status: string;
	completed?: number;
	total?: number;
	error?: string;
	bytesPerSec?: number;
	done: boolean;
	doneAt?: number;
	windowAt?: number;
	windowCompleted?: number;
	lastCompleted?: number;
};

/** How long a finished download lingers so a client can observe its terminal state. */
const DONE_TTL_MS = 30_000;

/** One SSE subscription + its downloads, per llama-server endpoint URL. */
type EndpointWatch = {
	downloads: Map<string, DownloadEntry>;
	abort: AbortController;
};

const watches = new Map<string, EndpointWatch>();

/** Starts (or reuses) the SSE subscription for `url`. */
function watchFor(url: string, apiKey?: string): EndpointWatch {
	const existing = watches.get(url);
	if (existing) return existing;

	const abort = new AbortController();
	const watch: EndpointWatch = { downloads: new Map(), abort };
	watches.set(url, watch);

	void consumeEvents({ url, apiKey, watch });
	return watch;
}

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Consumes the SSE stream until it ends, then reconnects with capped
 * exponential backoff — the router-side stream can drop on its own (a body
 * timeout, a server restart) with no client-side signal to distinguish that
 * from a deliberate teardown other than the abort flag. Only a deliberate
 * `abort()` (from a caller that no longer wants this watch) stops retrying.
 */
async function consumeEvents({
	url,
	apiKey,
	watch,
}: {
	url: string;
	apiKey?: string;
	watch: EndpointWatch;
}): Promise<void> {
	let backoffMs = RECONNECT_MIN_MS;
	while (!watch.abort.signal.aborted) {
		try {
			for await (const event of watchModels({ url, apiKey, signal: watch.abort.signal })) {
				applyEvent({ watch, event });
			}
			backoffMs = RECONNECT_MIN_MS; // a clean end (server closed politely) resets backoff
		} catch (error) {
			if (watch.abort.signal.aborted) break;
			console.warn("llama.cpp model-state stream ended unexpectedly; reconnecting", {
				url,
				error,
				backoffMs,
			});
		}
		if (watch.abort.signal.aborted) break;
		await sleep(backoffMs);
		backoffMs = Math.min(backoffMs * 2, RECONNECT_MAX_MS);
	}
	watches.delete(url);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyEvent({ watch, event }: { watch: EndpointWatch; event: ModelStateEvent }): void {
	const entry = watch.downloads.get(event.model) ?? { status: "Starting…", done: false };
	if (event.status === "error") {
		entry.status = "Error";
		entry.error = event.error ?? "Download failed";
		entry.done = true;
		entry.doneAt = Date.now();
	} else if (event.status === "downloading") {
		entry.status = "Downloading…";
		entry.completed = event.completed;
		entry.total = event.total;
		updateRate({ entry, completed: event.completed });
	} else if (event.status === "loaded" || event.status === "unloaded") {
		// A model that finished downloading (or was already present) reaching a
		// steady state is a completion signal only if we were tracking a download.
		if (!entry.done && (entry.completed !== undefined || entry.total !== undefined)) {
			entry.status = "success";
			entry.done = true;
			entry.doneAt = Date.now();
		} else {
			return; // Steady-state noise for a model we never tracked a download for.
		}
	} else {
		return;
	}
	watch.downloads.set(event.model, entry);
}

/**
 * Throughput averaged over the current window: bytes since the window opened
 * over elapsed time. A `completed` decrease means the router restarted the
 * download (e.g. after a resume), so the window restarts there too.
 */
function updateRate({
	entry,
	completed,
}: {
	entry: DownloadEntry;
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

/** Begin downloading a model, or no-op if a download for it is already tracked. */
export async function startDownload({
	url,
	model,
	apiKey,
}: {
	url: string;
	model: string;
	apiKey?: string;
}): Promise<void> {
	const watch = watchFor(url, apiKey);
	const existing = watch.downloads.get(model);
	if (existing && !existing.done) return;
	watch.downloads.set(model, { status: "Starting…", done: false });
	await downloadModel({ url, model, apiKey });
}

/** Cancels an in-flight download (unloading also cancels the download, per the router API). */
export async function cancelDownload({
	url,
	model,
	apiKey,
}: {
	url: string;
	model: string;
	apiKey?: string;
}): Promise<void> {
	const watch = watches.get(url);
	const entry = watch?.downloads.get(model);
	if (entry?.done) {
		watch?.downloads.delete(model);
		return;
	}
	await unloadModel({ url, model, apiKey });
	watch?.downloads.delete(model);
}

/** Live snapshots of downloads on `url`, including recently finished ones until they age out. */
export function listActiveDownloads(url: string): DownloadSnapshot[] {
	const watch = watches.get(url);
	if (!watch) return [];
	const now = Date.now();
	const snapshots: DownloadSnapshot[] = [];

	for (const [model, entry] of watch.downloads) {
		if (entry.done && entry.doneAt && now - entry.doneAt > DONE_TTL_MS) {
			watch.downloads.delete(model);
			continue;
		}
		snapshots.push({
			model,
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

/** Ensures a live SSE subscription exists for `url`, so `listActiveDownloads` has data. */
export function ensureWatching(url: string, apiKey?: string): void {
	watchFor(url, apiKey);
}
