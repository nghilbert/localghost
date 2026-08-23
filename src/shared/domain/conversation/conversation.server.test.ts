import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	conversationFindFirst,
	conversationUpdate,
	conversationDeleteMany,
	chatThreadDeleteMany,
	chatRunDeleteMany,
	chatInterruptDeleteMany,
	transaction,
	listModels,
} = vi.hoisted(() => ({
	conversationFindFirst: vi.fn(),
	conversationUpdate: vi.fn(),
	conversationDeleteMany: vi.fn(),
	chatThreadDeleteMany: vi.fn(),
	chatRunDeleteMany: vi.fn(),
	chatInterruptDeleteMany: vi.fn(),
	transaction: vi.fn((ops: unknown) =>
		typeof ops === "function" ? ops({}) : Promise.all(ops as Array<Promise<unknown>>),
	),
	listModels: vi.fn(),
}));

vi.mock("#/shared/lib/db.server", () => ({
	prisma: {
		conversation: {
			findFirst: conversationFindFirst,
			update: conversationUpdate,
			deleteMany: conversationDeleteMany,
		},
		chatThread: { deleteMany: chatThreadDeleteMany },
		chatRun: { deleteMany: chatRunDeleteMany },
		chatInterrupt: { deleteMany: chatInterruptDeleteMany },
		$transaction: transaction,
	},
}));
vi.mock("#/shared/lib/llamacpp/client.server", () => ({ listModels }));

import {
	patchConversation,
	probeModelRunState,
	removeConversation,
} from "#/shared/domain/conversation/conversation.server";

beforeEach(() => {
	vi.clearAllMocks();
	conversationDeleteMany.mockResolvedValue({ count: 1 });
	chatThreadDeleteMany.mockResolvedValue({ count: 1 });
	chatRunDeleteMany.mockResolvedValue({ count: 0 });
	chatInterruptDeleteMany.mockResolvedValue({ count: 0 });
});

describe("patchConversation", () => {
	it("throws when no conversation with that id is owned by the user", async () => {
		conversationFindFirst.mockResolvedValue(null);

		await expect(
			patchConversation({ id: "c1", ownerId: "owner-1", patch: { title: "New title" } }),
		).rejects.toThrow("Not found");
		expect(conversationUpdate).not.toHaveBeenCalled();
	});

	it("scopes the ownership lookup to the calling user, not just the id", async () => {
		conversationFindFirst.mockResolvedValue({ id: "c1" });

		await patchConversation({ id: "c1", ownerId: "owner-1", patch: { title: "New title" } });

		expect(conversationFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ id: "c1", ownerId: "owner-1" }) }),
		);
	});

	it("patches title when provided", async () => {
		conversationFindFirst.mockResolvedValue({ id: "c1" });

		await patchConversation({ id: "c1", ownerId: "owner-1", patch: { title: "New title" } });

		expect(conversationUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "c1" }, data: { title: "New title" } }),
		);
	});
});

describe("probeModelRunState", () => {
	it("reports ready when the conversation has no model", async () => {
		conversationFindFirst.mockResolvedValue({ model: null, endpoint: null });

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("ready");
		expect(listModels).not.toHaveBeenCalled();
	});

	it("reports ready for a non-llamacpp endpoint without probing", async () => {
		conversationFindFirst.mockResolvedValue({
			model: "gpt-4",
			endpoint: { url: "https://api.openai.com", provider: "openai" },
		});

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("ready");
		expect(listModels).not.toHaveBeenCalled();
	});

	it("reports ready when the model is loaded", async () => {
		conversationFindFirst.mockResolvedValue({
			model: "org/llama3-GGUF:Q4_K_M",
			endpoint: { url: "http://localhost:8080", provider: "llamacpp" },
		});
		listModels.mockResolvedValue([
			{ id: "org/llama3-GGUF:Q4_K_M", path: "/models/x.gguf", status: { value: "loaded" } },
		]);

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("ready");
	});

	it("reports ready when the model is unloaded (the router autoloads on request)", async () => {
		conversationFindFirst.mockResolvedValue({
			model: "org/llama3-GGUF:Q4_K_M",
			endpoint: { url: "http://localhost:8080", provider: "llamacpp" },
		});
		listModels.mockResolvedValue([
			{ id: "org/llama3-GGUF:Q4_K_M", path: "/models/x.gguf", status: { value: "unloaded" } },
		]);

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("ready");
	});

	it("reports warming when the model is loading", async () => {
		conversationFindFirst.mockResolvedValue({
			model: "org/llama3-GGUF:Q4_K_M",
			endpoint: { url: "http://localhost:8080", provider: "llamacpp" },
		});
		listModels.mockResolvedValue([
			{ id: "org/llama3-GGUF:Q4_K_M", path: "/models/x.gguf", status: { value: "loading" } },
		]);

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("warming");
	});

	it("silently reports unreachable when the probe throws", async () => {
		conversationFindFirst.mockResolvedValue({
			model: "org/llama3-GGUF:Q4_K_M",
			endpoint: { url: "http://localhost:8080", provider: "llamacpp" },
		});
		listModels.mockRejectedValue(new Error("connection refused"));
		const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("unreachable");
		expect(consoleWarn).toHaveBeenCalledOnce();
	});
});

describe("removeConversation", () => {
	it("is a no-op when the id isn't owned by the caller", async () => {
		conversationFindFirst.mockResolvedValue(null);

		await removeConversation({ id: "c1", ownerId: "owner-1" });

		expect(transaction).not.toHaveBeenCalled();
	});

	it("deletes the thread, runs, interrupts, and the conversation, all scoped to the caller", async () => {
		conversationFindFirst.mockResolvedValue({ id: "c1" });

		await removeConversation({ id: "c1", ownerId: "owner-1" });

		expect(chatThreadDeleteMany).toHaveBeenCalledWith({ where: { threadId: "c1" } });
		expect(chatRunDeleteMany).toHaveBeenCalledWith({ where: { threadId: "c1" } });
		expect(chatInterruptDeleteMany).toHaveBeenCalledWith({ where: { threadId: "c1" } });
		expect(conversationDeleteMany).toHaveBeenCalledWith({
			where: { id: "c1", ownerId: "owner-1" },
		});
	});
});
