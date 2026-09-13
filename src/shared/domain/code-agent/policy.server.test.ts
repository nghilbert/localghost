import type { StreamChunk } from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { evaluateCommand } from "@tanstack/ai-sandbox";
import { describe, expect, it } from "vitest";
import { CODE_AGENT_APPROVAL_EVENT } from "#/shared/domain/code-agent/approval";
import {
	buildCodeAgentPolicy,
	renameApprovalChunks,
} from "#/shared/domain/code-agent/policy.server";

async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const item of source) out.push(item);
	return out;
}

async function* chunks<T>(...items: T[]): AsyncGenerator<T> {
	for (const item of items) yield item;
}

describe("buildCodeAgentPolicy", () => {
	it("allows a command the user has approved", () => {
		const policy = buildCodeAgentPolicy({ approvedCommands: ["npm test"] });
		expect(evaluateCommand("npm test", policy)).toBe("allow");
	});

	it("still asks about a command nobody approved", () => {
		const policy = buildCodeAgentPolicy({ approvedCommands: ["npm test"] });
		expect(evaluateCommand("npm publish", policy)).toBe("ask");
	});

	it("keeps denying a destructive command even if it is approved", () => {
		const policy = buildCodeAgentPolicy({ approvedCommands: ["sudo rm -rf /srv"] });
		expect(evaluateCommand("sudo rm -rf /srv", policy)).toBe("deny");
	});
});

describe("renameApprovalChunks", () => {
	it("re-emits the sandbox's approval under our own event name", async () => {
		const approval: StreamChunk = {
			type: EventType.CUSTOM,
			name: "approval-requested",
			value: { approvalId: "claude-code:command:npm test", title: "npm test" },
		};

		const [chunk] = await collect(renameApprovalChunks(chunks(approval)));

		expect(chunk).toMatchObject({
			name: CODE_AGENT_APPROVAL_EVENT,
			value: { approvalId: "claude-code:command:npm test" },
		});
	});

	it("passes every other chunk through untouched", async () => {
		const other: StreamChunk = {
			type: EventType.CUSTOM,
			name: "claude-code.session-id",
			value: { id: "s" },
		};
		const text: StreamChunk = {
			type: EventType.TEXT_MESSAGE_CONTENT,
			messageId: "m1",
			delta: "hi",
		};

		expect(await collect(renameApprovalChunks(chunks<StreamChunk>(other, text)))).toEqual([
			other,
			text,
		]);
	});
});
