/**
 * In-memory source of truth for in-flight Ollama model pulls.
 *
 * A pull is driven server-side and survives every client disconnecting, so the
 * download keeps running while the user navigates away. Clients read live
 * progress by polling {@link getActivePulls} and cancel via {@link cancelPull},
 * which aborts the underlying Ollama request. Single-process is sufficient —
 * `docker compose up` runs one server instance (see memory `compose-is-prod`).
 */

/** Live progress for one model pull, as exposed to clients. */
export type PullSnapshot = {
	model: string;
	status: string;
	completed?: number;
	total?: number;
	error?: string;
	/** True once the pull reached a terminal state (success or error). */
	done: boolean;
};

type PullEntry = {
	status: string;
	completed?: number;
	total?: number;
	error?: string;
	done: boolean;
	doneAt?: number;
	controller: AbortController;
};

/** A single line of Ollama's NDJSON `/api/pull` stream. */
type OllamaPullLine = {
	status?: string;
	digest?: string;
	total?: number;
	completed?: number;
	error?: string;
};

/** How long a finished pull lingers so a client can observe its terminal state. */
const DONE_TTL_MS = 30_000;

const pulls = new Map<string, PullEntry>();
const keyFor = (userId: string, model: string) => `${userId}:${model}`;

/**
 * Begin downloading a model, or no-op if a pull for the same user+model is
 * already running (a caller returning to the page attaches to the live pull
 * rather than starting a second download).
 */
export function startPull(userId: string, model: string, ollamaUrl: string): void {
	const key = keyFor(userId, model);
	const existing = pulls.get(key);
	if (existing && !existing.done) return;

	const entry: PullEntry = { status: "Starting…", done: false, controller: new AbortController() };
	pulls.set(key, entry);
	void drivePull(key, entry, model, ollamaUrl);
}

/** Abort an in-flight pull; the download stops and the entry is dropped. */
export function cancelPull(userId: string, model: string): void {
	const entry = pulls.get(keyFor(userId, model));
	if (entry && !entry.done) entry.controller.abort();
}

/**
 * Live snapshots of the user's pulls, including recently finished ones (so the
 * client can fire a completion toast) until they age out.
 */
export function getActivePulls(userId: string): PullSnapshot[] {
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
			done: entry.done,
		});
	}

	return snapshots;
}

/** Streams Ollama's NDJSON pull progress into the registry entry until it ends. */
async function drivePull(
	key: string,
	entry: PullEntry,
	model: string,
	ollamaUrl: string,
): Promise<void> {
	try {
		const res = await fetch(`${ollamaUrl}/api/pull`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: model, stream: true }),
			signal: entry.controller.signal,
		});
		if (!res.ok || !res.body) {
			throw new Error(`Ollama responded ${res.status} ${res.statusText}`);
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				let parsed: OllamaPullLine;
				try {
					parsed = JSON.parse(trimmed);
				} catch {
					continue; // skip malformed NDJSON lines
				}
				if (parsed.error) return finish(entry, { status: "Error", error: parsed.error });
				if (parsed.status === "success") return finish(entry, { status: "success" });
				entry.status = parsed.status ?? "Downloading…";
				entry.completed = parsed.completed;
				entry.total = parsed.total;
			}
		}
		finish(entry, { status: "success" });
	} catch (err) {
		if (entry.controller.signal.aborted) {
			pulls.delete(key); // user stopped — drop immediately, nothing to report
			return;
		}
		finish(entry, { status: "Error", error: err instanceof Error ? err.message : "Pull failed" });
	}
}

function finish(entry: PullEntry, terminal: { status: string; error?: string }): void {
	entry.status = terminal.status;
	entry.error = terminal.error;
	entry.done = true;
	entry.doneAt = Date.now();
}
