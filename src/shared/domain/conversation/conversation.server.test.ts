import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "#/prisma/db";
import { nowTimestamp } from "#/shared/lib/temporal";

const { listModels } = vi.hoisted(() => ({ listModels: vi.fn() }));
vi.mock("#/shared/lib/llamacpp/client.server", () => ({ listModels }));

import {
	patchConversation,
	probeModelRunState,
	removeConversation,
} from "#/shared/domain/conversation/conversation.server";

let ownerId: string;
let endpointId: string;

beforeEach(async () => {
	vi.clearAllMocks();
	const user = await db.orm.public.User.create({
		name: "Test",
		email: `test-${crypto.randomUUID()}@example.com`,
		updatedAt: nowTimestamp(),
	});
	ownerId = user.id;
	const endpoint = await db.orm.public.Endpoint.create({
		name: "E",
		url: "http://localhost:8080",
		provider: "llamacpp",
		ownerId,
		updatedAt: nowTimestamp(),
	});
	endpointId = endpoint.id;
});

afterEach(async () => {
	await db.orm.public.User.where({ id: ownerId }).delete();
});

async function makeConversation(overrides: { model?: string; endpointId?: string | null } = {}) {
	return db.orm.public.Conversation.create({
		ownerId,
		title: "Test",
		model: overrides.model,
		endpointId: overrides.endpointId === undefined ? endpointId : overrides.endpointId,
		updatedAt: nowTimestamp(),
	});
}

describe("patchConversation", () => {
	it("throws when no conversation with that id is owned by the user", async () => {
		await expect(
			patchConversation({ id: crypto.randomUUID(), ownerId, patch: { title: "New title" } }),
		).rejects.toThrow("Not found");
	});

	it("scopes the ownership lookup to the calling user, not just the id", async () => {
		const conversation = await makeConversation();
		const otherOwner = crypto.randomUUID();

		await expect(
			patchConversation({ id: conversation.id, ownerId: otherOwner, patch: { title: "New" } }),
		).rejects.toThrow("Not found");
	});

	it("patches title when provided", async () => {
		const conversation = await makeConversation();

		const patched = await patchConversation({
			id: conversation.id,
			ownerId,
			patch: { title: "New title" },
		});

		expect(patched?.title).toBe("New title");
	});
});

describe("probeModelRunState", () => {
	it("reports ready when the conversation has no model", async () => {
		const conversation = await makeConversation({ model: undefined });

		expect(await probeModelRunState({ id: conversation.id, ownerId })).toBe("ready");
		expect(listModels).not.toHaveBeenCalled();
	});

	it("reports ready for a non-llamacpp endpoint without probing", async () => {
		const otherEndpoint = await db.orm.public.Endpoint.create({
			name: "OpenAI",
			url: "https://api.openai.com",
			provider: "openai",
			ownerId,
			updatedAt: nowTimestamp(),
		});
		const conversation = await makeConversation({ model: "gpt-4", endpointId: otherEndpoint.id });

		expect(await probeModelRunState({ id: conversation.id, ownerId })).toBe("ready");
		expect(listModels).not.toHaveBeenCalled();
	});

	it("reports ready when the model is loaded", async () => {
		const conversation = await makeConversation({ model: "org/llama3-GGUF:Q4_K_M" });
		listModels.mockResolvedValue([
			{ id: "org/llama3-GGUF:Q4_K_M", path: "/models/x.gguf", status: { value: "loaded" } },
		]);

		expect(await probeModelRunState({ id: conversation.id, ownerId })).toBe("ready");
	});

	it("reports ready when the model is unloaded (the router autoloads on request)", async () => {
		const conversation = await makeConversation({ model: "org/llama3-GGUF:Q4_K_M" });
		listModels.mockResolvedValue([
			{ id: "org/llama3-GGUF:Q4_K_M", path: "/models/x.gguf", status: { value: "unloaded" } },
		]);

		expect(await probeModelRunState({ id: conversation.id, ownerId })).toBe("ready");
	});

	it("reports warming when the model is loading", async () => {
		const conversation = await makeConversation({ model: "org/llama3-GGUF:Q4_K_M" });
		listModels.mockResolvedValue([
			{ id: "org/llama3-GGUF:Q4_K_M", path: "/models/x.gguf", status: { value: "loading" } },
		]);

		expect(await probeModelRunState({ id: conversation.id, ownerId })).toBe("warming");
	});

	it("silently reports unreachable when the probe throws", async () => {
		const conversation = await makeConversation({ model: "org/llama3-GGUF:Q4_K_M" });
		listModels.mockRejectedValue(new Error("connection refused"));
		const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

		expect(await probeModelRunState({ id: conversation.id, ownerId })).toBe("unreachable");
		expect(consoleWarn).toHaveBeenCalledOnce();
	});
});

describe("removeConversation", () => {
	it("is a no-op when the id isn't owned by the caller", async () => {
		const conversation = await makeConversation();

		await removeConversation({ id: conversation.id, ownerId: crypto.randomUUID() });

		expect(await db.orm.public.Conversation.first({ id: conversation.id })).not.toBeNull();
	});

	it("deletes the thread, runs, interrupts, and the conversation, all scoped to the caller", async () => {
		const conversation = await makeConversation();
		await db.orm.public.ChatThread.create({
			threadId: conversation.id,
			messages: [],
			updatedAt: nowTimestamp(),
		});
		await db.orm.public.ChatRun.create({
			runId: crypto.randomUUID(),
			threadId: conversation.id,
			status: "completed",
			startedAt: 0n,
		});
		await db.orm.public.ChatInterrupt.create({
			interruptId: crypto.randomUUID(),
			runId: crypto.randomUUID(),
			threadId: conversation.id,
			status: "resolved",
			requestedAt: 0n,
			payload: {},
		});

		await removeConversation({ id: conversation.id, ownerId });

		expect(await db.orm.public.Conversation.first({ id: conversation.id })).toBeNull();
		expect(await db.orm.public.ChatThread.first({ threadId: conversation.id })).toBeNull();
		const { total: runs } = await db.orm.public.ChatRun.where({
			threadId: conversation.id,
		}).aggregate((a) => ({ total: a.count() }));
		expect(runs).toBe(0);
		const { total: interrupts } = await db.orm.public.ChatInterrupt.where({
			threadId: conversation.id,
		}).aggregate((a) => ({ total: a.count() }));
		expect(interrupts).toBe(0);
	});
});
