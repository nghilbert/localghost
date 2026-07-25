import { beforeEach, describe, expect, it, vi } from "vitest";

const { conversationFindFirst, conversationUpdate, listModels } = vi.hoisted(() => ({
	conversationFindFirst: vi.fn(),
	conversationUpdate: vi.fn(),
	listModels: vi.fn(),
}));

vi.mock("#/shared/lib/db.server", () => ({
	prisma: {
		conversation: { findFirst: conversationFindFirst, update: conversationUpdate },
	},
}));
vi.mock("#/shared/lib/llamacpp/client.server", () => ({ listModels }));

import {
	patchConversation,
	probeModelRunState,
} from "#/shared/domain/conversation/conversation.server";

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
