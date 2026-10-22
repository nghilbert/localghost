import { randomUUID } from "node:crypto";
import type { TextOptions } from "@tanstack/ai";
import type { FakeResponse, FakeResponseStep } from "@tanstack/ai/testing";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, vi } from "vitest";
import { z } from "zod";
import { insertMemory } from "#/features/memory/server/memory.server";
import { encrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { createConversation, createEndpoint, createUser, it } from "#/test/db.server";
import { network } from "#/test/network.server";
import { postChatStream } from "./stream.server";

const { fake } = await vi.hoisted(async () => {
	const { fakeText } = await import("@tanstack/ai/testing");
	return { fake: fakeText() };
});

// Every OpenAI-compatible endpoint answers from the script; the rest of the request is real.
vi.mock("@tanstack/ai-openai/compatible", () => ({ openaiCompatibleText: () => fake }));

/** The part of a stream event these tests read. */
const eventSchema = z.object({ type: z.string(), delta: z.string().optional() });

/** The requests the fake model received, in order. */
let requests: TextOptions[] = [];

/** A scripted answer that records the request it answers. */
function reply(response: FakeResponse): FakeResponseStep {
	return ({ request }) => {
		requests.push(request);
		return response;
	};
}

/** The request of the model's `index`th call. */
function requestAt(index: number): TextOptions {
	const request = requests[index];
	if (!request) throw new Error(`the model was called ${requests.length} times`);
	return request;
}

function systemPromptText(request: TextOptions): string {
	return JSON.stringify(request.systemPrompts ?? []);
}

/** The reply's text, joined from its streamed deltas. */
function replyText(body: string): string {
	return body
		.split("\n")
		.filter((line) => line.startsWith("data: "))
		.map((line) => eventSchema.parse(JSON.parse(line.slice("data: ".length))))
		.map((event) => (event.type === "TEXT_MESSAGE_CONTENT" ? (event.delta ?? "") : ""))
		.join("");
}

function toolNames(request: TextOptions): string[] {
	return (request.tools ?? []).map(({ name }: { name: string }) => name);
}

/** A user with an OpenAI-compatible endpoint and a conversation on it. */
async function setupChat(user: { systemPrompt?: string; temperature?: number } = {}) {
	const owner = await createUser(user);
	const endpoint = await createEndpoint({
		ownerId: owner.id,
		provider: "openai",
		apiKeyEncrypted: encrypt("key"),
	});
	const conversation = await createConversation({
		ownerId: owner.id,
		endpointId: endpoint.id,
		model: "fake-model",
	});
	return { userId: owner.id, threadId: conversation.id, endpointId: endpoint.id };
}

/** Posts one user message as the chat client does, and reads the whole event stream. */
async function postRun({
	userId,
	threadId,
	text = "Hello there",
	runId = randomUUID(),
	forwardedProps = { enabledTools: [] },
}: {
	userId: string;
	threadId: string;
	text?: string;
	runId?: string;
	forwardedProps?: unknown;
}) {
	const request = new Request("http://localhost/api/chat/stream", {
		method: "POST",
		body: JSON.stringify({
			threadId,
			runId,
			messages: [{ id: randomUUID(), role: "user", content: text }],
			tools: [],
			context: [],
			state: {},
			forwardedProps,
		}),
	});
	const response = await postChatStream({ request, userId });
	return { status: response.status, body: await response.text(), runId };
}

beforeEach(() => {
	requests = [];
	fake.setResponses([]);
	// The endpoint serves no embeddings, so memory falls back to keyword search.
	network.use(http.post("*/embeddings", () => new HttpResponse(null, { status: 404 })));
});

describe("postChatStream guards", () => {
	it("refuses another user's conversation without calling the model", async () => {
		const { threadId } = await setupChat();
		const stranger = await createUser();
		fake.setResponses([reply({ text: "leaked" })]);

		const { status } = await postRun({ userId: stranger.id, threadId });

		expect(status).toBe(404);
		expect(requests).toHaveLength(0);
	});

	it("refuses a conversation with no endpoint", async () => {
		const owner = await createUser();
		const conversation = await createConversation({ ownerId: owner.id });

		const { status } = await postRun({ userId: owner.id, threadId: conversation.id });

		expect(status).toBe(409);
	});

	it("refuses a run id that belongs to another thread", async () => {
		const first = await setupChat();
		fake.setResponses([reply({ text: "First reply" })]);
		const { runId } = await postRun(first);
		const other = await createConversation({
			ownerId: first.userId,
			endpointId: first.endpointId,
			model: "fake-model",
		});

		const { status } = await postRun({ userId: first.userId, threadId: other.id, runId });

		expect(status).toBe(403);
	});

	it("refuses malformed forwarded props", async () => {
		const chat = await setupChat();

		const { status } = await postRun({ ...chat, forwardedProps: { enabledTools: "web_search" } });

		expect(status).toBe(400);
	});
});

describe("postChatStream runs", () => {
	it("streams the reply and saves the turn", async () => {
		const chat = await setupChat();
		fake.setResponses([reply({ text: "Hi! How can I help?" })]);

		const { status, body, runId } = await postRun(chat);

		expect(status).toBe(200);
		expect(replyText(body)).toBe("Hi! How can I help?");
		expect(body).toContain('"type":"RUN_FINISHED"');
		const thread = await prisma.chatThread.findUnique({ where: { threadId: chat.threadId } });
		expect(JSON.stringify(thread?.messages)).toContain("Hello there");
		expect(JSON.stringify(thread?.messages)).toContain("Hi! How can I help?");
		const run = await prisma.chatRun.findUnique({ where: { runId } });
		expect(run?.status).toBe("completed");
	});

	it("sends the user's system prompt, temperature, and the memory tools", async () => {
		const chat = await setupChat({ systemPrompt: "Answer like a pirate.", temperature: 0.3 });
		fake.setResponses([reply({ text: "Arr." })]);

		await postRun(chat);

		const request = requestAt(0);
		expect(systemPromptText(request)).toContain("Current date and time:");
		expect(systemPromptText(request)).toContain("Answer like a pirate.");
		expect(request.modelOptions).toMatchObject({ temperature: 0.3 });
		expect(toolNames(request).toSorted((a, b) => a.localeCompare(b))).toEqual([
			"delete_memory",
			"manage_memory",
		]);
	});

	it("adds the web tools and their hint when web search is on", async () => {
		const chat = await setupChat();
		fake.setResponses([reply({ text: "Searching is available." })]);

		await postRun({ ...chat, forwardedProps: { enabledTools: ["web_search"] } });

		const request = requestAt(0);
		expect(toolNames(request)).toEqual(expect.arrayContaining(["web_search", "read_url"]));
		expect(systemPromptText(request)).toContain("enabled web search");
	});

	it("recalls a saved memory into the system prompt", async () => {
		const chat = await setupChat();
		await insertMemory({
			db: prisma,
			ownerId: chat.userId,
			text: "The user's cat is named Miso",
			source: "test",
			embedding: null,
		});
		fake.setResponses([reply({ text: "Miso!" })]);

		await postRun({ ...chat, text: "What is my cat named?" });

		expect(systemPromptText(requestAt(0))).toContain("The user's cat is named Miso");
	});

	it("runs a tool call and sends its result back to the model", async () => {
		const chat = await setupChat();
		fake.setResponses([
			reply({
				toolCalls: [
					{ name: "manage_memory", input: { action: "add", text: "The user likes green tea" } },
				],
			}),
			reply({ text: "Noted." }),
		]);

		const { body } = await postRun({ ...chat, text: "Remember that I like green tea" });

		expect(requests).toHaveLength(2);
		expect(JSON.stringify(requestAt(1).messages)).toContain("Memory saved:");
		expect(replyText(body)).toBe("Noted.");
		const memories = await prisma.memory.findMany({ where: { ownerId: chat.userId } });
		expect(memories.map((memory) => memory.text)).toEqual(["The user likes green tea"]);
	});

	it("stops for approval before deleting a memory", async () => {
		const chat = await setupChat();
		await insertMemory({
			db: prisma,
			ownerId: chat.userId,
			text: "Keep me",
			source: "test",
			embedding: null,
		});
		const memory = await prisma.memory.findFirstOrThrow({ where: { ownerId: chat.userId } });
		fake.setResponses([
			reply({ toolCalls: [{ name: "delete_memory", input: { id: memory.id } }] }),
			reply({ text: "Deleted." }),
		]);

		const { runId } = await postRun({ ...chat, text: "Forget that" });

		expect(requests).toHaveLength(1);
		const run = await prisma.chatRun.findUnique({ where: { runId } });
		expect(run?.status).toBe("interrupted");
		const interrupts = await prisma.chatInterrupt.findMany({ where: { runId } });
		expect(interrupts.map((interrupt) => interrupt.status)).toEqual(["pending"]);
		expect(await prisma.memory.count({ where: { id: memory.id } })).toBe(1);
	});

	it("reports a model error and saves it on the run", async () => {
		const chat = await setupChat();
		fake.setResponses([reply({ error: "The model fell over" })]);

		const { body, runId } = await postRun(chat);

		expect(body).toContain('"type":"RUN_ERROR"');
		expect(body).toContain("The model fell over");
		const run = await prisma.chatRun.findUnique({ where: { runId } });
		expect(run).toMatchObject({ status: "failed", error: "The model fell over" });
	});
});
