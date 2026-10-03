import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "#/lib/db.server";
import { log } from "#/lib/log.server";
import { createConversation, createEndpoint, createUser, resetDb } from "#/test/db.server";

const { listModels } = vi.hoisted(() => ({ listModels: vi.fn() }));
vi.mock("#/lib/llamacpp/client.server", () => ({ listModels }));

import { patchConversation, probeModelRunState, removeConversation } from "./chat.server";

beforeEach(async () => {
	await resetDb();
	vi.clearAllMocks();
});

describe("patchConversation", () => {
	it("throws when no conversation with that id is owned by the user", async () => {
		const user = await createUser();

		await expect(
			patchConversation({ id: randomUUID(), ownerId: user.id, patch: { title: "New title" } }),
		).rejects.toThrow("Not found");
	});

	it("scopes the ownership lookup to the calling user, not just the id", async () => {
		const owner = await createUser();
		const intruder = await createUser();
		const conversation = await createConversation({ ownerId: owner.id });

		await expect(
			patchConversation({
				id: conversation.id,
				ownerId: intruder.id,
				patch: { title: "New title" },
			}),
		).rejects.toThrow("Not found");
	});

	it("patches title when provided", async () => {
		const user = await createUser();
		const conversation = await createConversation({ ownerId: user.id, title: "Old title" });

		const patched = await patchConversation({
			id: conversation.id,
			ownerId: user.id,
			patch: { title: "New title" },
		});

		expect(patched.title).toBe("New title");
		expect(
			(await prisma.conversation.findUniqueOrThrow({ where: { id: conversation.id } })).title,
		).toBe("New title");
	});
});

describe("probeModelRunState", () => {
	it("reports ready when the conversation has no model", async () => {
		const user = await createUser();
		const conversation = await createConversation({ ownerId: user.id });

		expect(await probeModelRunState({ id: conversation.id, ownerId: user.id })).toBe("ready");
		expect(listModels).not.toHaveBeenCalled();
	});

	it("reports ready for a non-llamacpp endpoint without probing", async () => {
		const user = await createUser();
		const endpoint = await createEndpoint({
			ownerId: user.id,
			url: "https://api.openai.com",
			provider: "openai",
		});
		const conversation = await createConversation({
			ownerId: user.id,
			endpointId: endpoint.id,
			model: "gpt-4",
		});

		expect(await probeModelRunState({ id: conversation.id, ownerId: user.id })).toBe("ready");
		expect(listModels).not.toHaveBeenCalled();
	});

	it("reports ready when the model is loaded", async () => {
		const user = await createUser();
		const endpoint = await createEndpoint({
			ownerId: user.id,
			url: "http://localhost:8080",
			provider: "llamacpp",
		});
		const conversation = await createConversation({
			ownerId: user.id,
			endpointId: endpoint.id,
			model: "org/llama3-GGUF:Q4_K_M",
		});
		listModels.mockResolvedValue([
			{ id: "org/llama3-GGUF:Q4_K_M", path: "/models/x.gguf", status: { value: "loaded" } },
		]);

		expect(await probeModelRunState({ id: conversation.id, ownerId: user.id })).toBe("ready");
	});

	it("reports warming when the model is unloaded, since the request loads it", async () => {
		const user = await createUser();
		const endpoint = await createEndpoint({
			ownerId: user.id,
			url: "http://localhost:8080",
			provider: "llamacpp",
		});
		const conversation = await createConversation({
			ownerId: user.id,
			endpointId: endpoint.id,
			model: "org/llama3-GGUF:Q4_K_M",
		});
		listModels.mockResolvedValue([
			{ id: "org/llama3-GGUF:Q4_K_M", path: "/models/x.gguf", status: { value: "unloaded" } },
		]);

		expect(await probeModelRunState({ id: conversation.id, ownerId: user.id })).toBe("warming");
	});

	it("reports warming when the model is loading", async () => {
		const user = await createUser();
		const endpoint = await createEndpoint({
			ownerId: user.id,
			url: "http://localhost:8080",
			provider: "llamacpp",
		});
		const conversation = await createConversation({
			ownerId: user.id,
			endpointId: endpoint.id,
			model: "org/llama3-GGUF:Q4_K_M",
		});
		listModels.mockResolvedValue([
			{ id: "org/llama3-GGUF:Q4_K_M", path: "/models/x.gguf", status: { value: "loading" } },
		]);

		expect(await probeModelRunState({ id: conversation.id, ownerId: user.id })).toBe("warming");
	});

	it("silently reports unreachable when the probe throws", async () => {
		const user = await createUser();
		const endpoint = await createEndpoint({
			ownerId: user.id,
			url: "http://localhost:8080",
			provider: "llamacpp",
		});
		const conversation = await createConversation({
			ownerId: user.id,
			endpointId: endpoint.id,
			model: "org/llama3-GGUF:Q4_K_M",
		});
		listModels.mockRejectedValue(new Error("connection refused"));
		const logWarn = vi.spyOn(log, "warn").mockImplementation(() => {});

		expect(await probeModelRunState({ id: conversation.id, ownerId: user.id })).toBe("unreachable");
		expect(logWarn).toHaveBeenCalledOnce();
	});
});

describe("removeConversation", () => {
	it("is a no-op when the id isn't owned by the caller", async () => {
		const owner = await createUser();
		const intruder = await createUser();
		const conversation = await createConversation({ ownerId: owner.id });

		await removeConversation({ id: conversation.id, ownerId: intruder.id });

		expect(await prisma.conversation.findUnique({ where: { id: conversation.id } })).not.toBeNull();
	});

	it("deletes the thread, runs, interrupts, and the conversation, all scoped to the caller", async () => {
		const user = await createUser();
		const conversation = await createConversation({ ownerId: user.id });
		await prisma.chatThread.create({ data: { threadId: conversation.id, messages: [] } });
		await prisma.chatRun.create({
			data: {
				runId: "run-1",
				threadId: conversation.id,
				status: "finished",
				startedAt: BigInt(Date.now()),
			},
		});
		await prisma.chatInterrupt.create({
			data: {
				interruptId: "int-1",
				runId: "run-1",
				threadId: conversation.id,
				status: "resolved",
				requestedAt: BigInt(Date.now()),
				payload: {},
			},
		});

		await removeConversation({ id: conversation.id, ownerId: user.id });

		expect(await prisma.conversation.findUnique({ where: { id: conversation.id } })).toBeNull();
		expect(await prisma.chatThread.findUnique({ where: { threadId: conversation.id } })).toBeNull();
		expect(await prisma.chatRun.findMany({ where: { threadId: conversation.id } })).toEqual([]);
		expect(await prisma.chatInterrupt.findMany({ where: { threadId: conversation.id } })).toEqual(
			[],
		);
	});
});
