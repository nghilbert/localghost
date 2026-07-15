import { beforeEach, describe, expect, it, vi } from "vitest";

const { conversationFindFirst, conversationUpdate, ollamaPs } = vi.hoisted(() => ({
	conversationFindFirst: vi.fn(),
	conversationUpdate: vi.fn(),
	ollamaPs: vi.fn(),
}));

vi.mock("#/shared/lib/db.server", () => ({
	prisma: {
		conversation: { findFirst: conversationFindFirst, update: conversationUpdate },
	},
}));
vi.mock("#/shared/lib/ollama/client.server", () => ({
	ollamaClient: () => ({ ps: ollamaPs }),
}));

import { patchConversation, probeModelRunState } from "#/entities/conversation/conversation.server";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("patchConversation", () => {
	it("throws when no conversation with that id is owned by the user", async () => {
		conversationFindFirst.mockResolvedValue(null);

		await expect(
			patchConversation({ id: "c1", ownerId: "owner-1", patch: { title: "New title" } }),
		).rejects.toThrow("Not found");
		expect(conversationUpdate).not.toHaveBeenCalled();
	});

	it("patches title when provided", async () => {
		conversationFindFirst.mockResolvedValue({ id: "c1" });

		await patchConversation({ id: "c1", ownerId: "owner-1", patch: { title: "New title" } });

		expect(conversationUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "c1" }, data: { title: "New title" } }),
		);
	});

	it("leaves title untouched when omitted from the patch", async () => {
		conversationFindFirst.mockResolvedValue({ id: "c1" });

		await patchConversation({ id: "c1", ownerId: "owner-1", patch: {} });

		expect(conversationUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: {} }));
	});
});

describe("probeModelRunState", () => {
	it("reports ready when the conversation has no model", async () => {
		conversationFindFirst.mockResolvedValue({ model: null, endpoint: null });

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("ready");
		expect(ollamaPs).not.toHaveBeenCalled();
	});

	it("reports ready for a non-ollama endpoint without probing", async () => {
		conversationFindFirst.mockResolvedValue({
			model: "gpt-4",
			endpoint: { url: "https://api.openai.com", provider: "openai" },
		});

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("ready");
		expect(ollamaPs).not.toHaveBeenCalled();
	});

	it("reports ready when the model is in Ollama's loaded list", async () => {
		conversationFindFirst.mockResolvedValue({
			model: "llama3",
			endpoint: { url: "http://localhost:11434", provider: "ollama" },
		});
		ollamaPs.mockResolvedValue({ models: [{ name: "llama3", model: "llama3:latest" }] });

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("ready");
	});

	it("reports warming when the model isn't loaded yet", async () => {
		conversationFindFirst.mockResolvedValue({
			model: "llama3",
			endpoint: { url: "http://localhost:11434", provider: "ollama" },
		});
		ollamaPs.mockResolvedValue({ models: [] });

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("warming");
	});

	it("silently reports unreachable when the probe throws", async () => {
		conversationFindFirst.mockResolvedValue({
			model: "llama3",
			endpoint: { url: "http://localhost:11434", provider: "ollama" },
		});
		ollamaPs.mockRejectedValue(new Error("connection refused"));
		const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

		expect(await probeModelRunState({ id: "c1", ownerId: "owner-1" })).toBe("unreachable");
		expect(consoleWarn).toHaveBeenCalledOnce();
	});
});
