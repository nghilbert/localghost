import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ollamaClient, pullUpsert, pullDeleteMany, pullFindMany } = vi.hoisted(() => ({
	ollamaClient: vi.fn(),
	pullUpsert: vi.fn(),
	pullDeleteMany: vi.fn(),
	pullFindMany: vi.fn(),
}));
vi.mock("#/shared/lib/ollama/client.server", () => ({ ollamaClient }));
vi.mock("#/shared/lib/db.server", () => ({
	prisma: {
		ollamaPull: { upsert: pullUpsert, deleteMany: pullDeleteMany, findMany: pullFindMany },
	},
}));

import {
	cancelPull,
	listActivePulls,
	resumeOrphanedPulls,
	startPull,
} from "#/features/pull-model/lib/ollama/pull-registry.server";

/** How long a finished pull lingers before `listActivePulls` prunes it (mirrors the module). */
const DONE_TTL_MS = 30_000;

type Part = { status?: string; completed?: number; total?: number };

/**
 * A stand-in for the SDK's pull stream: `push` feeds a progress part, `end`
 * closes it cleanly, and `abort` rejects the iterator the way `stream.abort()` does.
 */
function controllableStream() {
	const parts: Part[] = [];
	let notifyResolve: (() => void) | null = null;
	let notifyReject: ((err: Error) => void) | null = null;
	let ended = false;
	let aborted = false;

	const abort = vi.fn(() => {
		aborted = true;
		notifyReject?.(new Error("aborted"));
		notifyResolve?.();
		notifyResolve = notifyReject = null;
	});

	async function* gen(): AsyncGenerator<Part> {
		let i = 0;
		while (true) {
			if (i < parts.length) {
				const next = parts[i++];
				if (next !== undefined) yield next;
				continue;
			}
			if (ended || aborted) {
				if (aborted) throw new Error("aborted");
				return;
			}
			await new Promise<void>((resolve, reject) => {
				notifyResolve = resolve;
				notifyReject = reject;
			});
		}
	}

	const stream = Object.assign(gen(), { abort });
	return {
		stream,
		abort,
		push(part: Part) {
			parts.push(part);
			notifyResolve?.();
			notifyResolve = notifyReject = null;
		},
		end() {
			ended = true;
			notifyResolve?.();
			notifyResolve = notifyReject = null;
		},
	};
}

function mockPullResolving(stream: unknown) {
	const pull = vi.fn().mockResolvedValue(stream);
	ollamaClient.mockReturnValue({ pull });
	return pull;
}

const tick = (ms = 0) => vi.advanceTimersByTimeAsync(ms);
const args = { userId: "u", model: "llama3", ollamaUrl: "http://x" };

beforeEach(() => {
	vi.clearAllMocks();
	pullUpsert.mockResolvedValue(undefined);
	pullDeleteMany.mockResolvedValue({ count: 0 });
	pullFindMany.mockResolvedValue([]);
	vi.useFakeTimers();
});

afterEach(() => {
	// Drop any lingering entry so the module-level map doesn't cross tests.
	cancelPull({ userId: "u", model: "llama3" });
	vi.useRealTimers();
});

describe("startPull + listActivePulls", () => {
	it("surfaces streamed progress, then a terminal success", async () => {
		const ctrl = controllableStream();
		mockPullResolving(ctrl.stream);

		startPull(args);
		await tick();
		ctrl.push({ status: "pulling", completed: 10, total: 100 });
		await tick();

		expect(listActivePulls("u")[0]).toMatchObject({
			model: "llama3",
			status: "pulling",
			completed: 10,
			total: 100,
			done: false,
		});

		ctrl.push({ status: "success" });
		await tick();
		expect(listActivePulls("u")[0]).toMatchObject({ status: "success", done: true });
	});

	it("marks a failed pull terminal with its error message", async () => {
		ollamaClient.mockReturnValue({ pull: vi.fn().mockRejectedValue(new Error("net down")) });

		startPull(args);
		await tick();

		expect(listActivePulls("u")[0]).toMatchObject({
			status: "Error",
			error: "net down",
			done: true,
		});
	});

	it("attaches to the live pull instead of starting a second download", async () => {
		const ctrl = controllableStream();
		const pull = mockPullResolving(ctrl.stream);

		startPull(args);
		await tick();
		startPull(args);
		await tick();

		expect(pull).toHaveBeenCalledTimes(1);
	});

	it("only reports pulls belonging to the given user", async () => {
		mockPullResolving(controllableStream().stream);
		startPull(args);
		await tick();

		expect(listActivePulls("someone-else")).toEqual([]);
	});
});

describe("pull persistence + resume after restart", () => {
	it("persists a starting pull and clears the record on terminal success", async () => {
		const ctrl = controllableStream();
		mockPullResolving(ctrl.stream);

		void startPull(args);
		await tick();
		expect(pullUpsert).toHaveBeenCalledWith({
			where: { ownerId_model: { ownerId: "u", model: "llama3" } },
			create: { ownerId: "u", model: "llama3", ollamaUrl: "http://x" },
			update: { ollamaUrl: "http://x" },
		});

		ctrl.push({ status: "success" });
		await tick();
		expect(pullDeleteMany).toHaveBeenCalledWith({ where: { ownerId: "u", model: "llama3" } });
	});

	it("restarts persisted pulls when the registry lost them (server restart)", async () => {
		mockPullResolving(controllableStream().stream);
		pullFindMany.mockResolvedValue([{ model: "phi3", ollamaUrl: "http://x" }]);

		await resumeOrphanedPulls("u2");
		await tick();

		expect(listActivePulls("u2")[0]).toMatchObject({ model: "phi3", done: false });
		cancelPull({ userId: "u2", model: "phi3" });
	});

	it("skips the resume lookup while the user already has a live entry", async () => {
		mockPullResolving(controllableStream().stream);
		void startPull({ userId: "u3", model: "llama3", ollamaUrl: "http://x" });
		await tick();

		await resumeOrphanedPulls("u3");

		expect(pullFindMany).not.toHaveBeenCalled();
		cancelPull({ userId: "u3", model: "llama3" });
	});
});

describe("throughput windowing", () => {
	it("averages bytes over the current layer and restarts on a layer switch", async () => {
		const ctrl = controllableStream();
		mockPullResolving(ctrl.stream);

		startPull(args);
		await tick();

		ctrl.push({ status: "pulling", completed: 0 });
		await tick();
		await tick(1000);
		ctrl.push({ status: "pulling", completed: 1000 });
		await tick();
		expect(listActivePulls("u")[0]?.bytesPerSec).toBe(1000);

		// completed drops: a new layer began, so the window restarts here.
		ctrl.push({ status: "pulling", completed: 200 });
		await tick();
		await tick(1000);
		ctrl.push({ status: "pulling", completed: 700 });
		await tick();
		expect(listActivePulls("u")[0]?.bytesPerSec).toBe(500);
	});
});

describe("terminal-state aging", () => {
	it("keeps a finished pull until the TTL, then prunes it", async () => {
		const ctrl = controllableStream();
		mockPullResolving(ctrl.stream);

		startPull(args);
		await tick();
		ctrl.push({ status: "success" });
		await tick();

		await tick(DONE_TTL_MS - 1);
		expect(listActivePulls("u")).toHaveLength(1);

		await tick(2);
		expect(listActivePulls("u")).toEqual([]);
	});
});

describe("cancelPull", () => {
	it("aborts and drops an in-flight pull without reporting an error", async () => {
		const ctrl = controllableStream();
		mockPullResolving(ctrl.stream);

		startPull(args);
		await tick();
		ctrl.push({ status: "pulling", completed: 5 });
		await tick();

		cancelPull({ userId: "u", model: "llama3" });
		await tick();

		expect(ctrl.abort).toHaveBeenCalled();
		expect(listActivePulls("u")).toEqual([]);
	});

	it("honors cancellation that arrives before the pull stream resolves", async () => {
		const ctrl = controllableStream();
		let resolvePull: (stream: unknown) => void = () => {};
		const pullPromise = new Promise((resolve) => {
			resolvePull = resolve;
		});
		ollamaClient.mockReturnValue({ pull: vi.fn().mockReturnValue(pullPromise) });

		startPull(args);
		await tick();
		cancelPull({ userId: "u", model: "llama3" });
		resolvePull(ctrl.stream);
		await tick();

		expect(ctrl.abort).toHaveBeenCalled();
		expect(listActivePulls("u")).toEqual([]);
	});

	it("drops an already-finished entry so a failed pull can be dismissed", async () => {
		ollamaClient.mockReturnValue({ pull: vi.fn().mockRejectedValue(new Error("boom")) });

		startPull(args);
		await tick();
		expect(listActivePulls("u")[0]).toMatchObject({ done: true });

		cancelPull({ userId: "u", model: "llama3" });
		expect(listActivePulls("u")).toEqual([]);
	});
});
