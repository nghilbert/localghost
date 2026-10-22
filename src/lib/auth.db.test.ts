import { describe, expect } from "vitest";
import { prisma } from "#/lib/db.server";
import { createConversation, createUser, it } from "#/test/db.server";
import { auth } from "./auth.server";

/** Adds a thread, a run and an interrupt to a conversation, as a finished chat leaves them. */
async function addChatRows(threadId: string) {
	await prisma.chatThread.create({ data: { threadId, messages: [] } });
	await prisma.chatRun.create({
		data: { runId: `run-${threadId}`, threadId, status: "finished", startedAt: BigInt(Date.now()) },
	});
	await prisma.chatInterrupt.create({
		data: {
			interruptId: `interrupt-${threadId}`,
			runId: `run-${threadId}`,
			threadId,
			status: "resolved",
			requestedAt: BigInt(Date.now()),
			payload: {},
		},
	});
}

describe("deleting an account", () => {
	it("deletes the account's chat threads, runs and interrupts, and keeps everyone else's", async () => {
		const password = "a long enough password";
		const { headers } = await auth.api.signUpEmail({
			body: { name: "Sam", email: "sam@example.com", password },
			returnHeaders: true,
		});
		const sam = await prisma.user.findUniqueOrThrow({ where: { email: "sam@example.com" } });
		const samsChat = await createConversation({ ownerId: sam.id });
		await addChatRows(samsChat.id);
		const alex = await createUser();
		const alexsChat = await createConversation({ ownerId: alex.id });
		await addChatRows(alexsChat.id);

		await auth.api.deleteUser({
			body: { password },
			headers: { cookie: headers.getSetCookie().join("; ") },
		});

		expect(await prisma.user.findUnique({ where: { id: sam.id } })).toBeNull();
		expect(await prisma.chatThread.findMany({ select: { threadId: true } })).toEqual([
			{ threadId: alexsChat.id },
		]);
		expect(await prisma.chatRun.findMany({ select: { threadId: true } })).toEqual([
			{ threadId: alexsChat.id },
		]);
		expect(await prisma.chatInterrupt.findMany({ select: { threadId: true } })).toEqual([
			{ threadId: alexsChat.id },
		]);
	});
});
