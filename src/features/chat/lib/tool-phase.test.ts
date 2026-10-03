import { describe, expect, it } from "vitest";
import type { ChatToolCall, ChatToolResult } from "./chat-tools";
import { toolPhase } from "./tool-phase";

function call(state: ChatToolCall["state"], output?: string): ChatToolCall {
	return { type: "tool-call", id: "c1", name: "web_search", arguments: "{}", state, output };
}

function result(fields: Partial<ChatToolResult>): ChatToolResult {
	return { type: "tool-result", toolCallId: "c1", content: "", state: "complete", ...fields };
}

describe("toolPhase", () => {
	it("is choosing while the model writes the arguments", () => {
		expect(toolPhase(call("awaiting-input"), undefined, true)).toBe("choosing");
		expect(toolPhase(call("input-streaming"), undefined, true)).toBe("choosing");
	});

	it("is running once the arguments are complete", () => {
		expect(toolPhase(call("input-complete"), undefined, true)).toBe("running");
	});

	it("is done with output, a result, or a complete state", () => {
		expect(toolPhase(call("input-complete", "results"), undefined, false)).toBe("done");
		expect(toolPhase(call("input-complete"), result({}), true)).toBe("done");
		expect(toolPhase(call("complete"), undefined, false)).toBe("done");
	});

	it("is failed for an error result", () => {
		expect(toolPhase(call("input-complete"), result({ state: "error" }), false)).toBe("failed");
	});

	it("tells a denied call from a cancelled one", () => {
		const denied = result({ state: "error", outcome: "denied" });
		const cancelled = result({ state: "error", outcome: "cancelled" });
		expect(toolPhase(call("approval-responded"), denied, false)).toBe("denied");
		expect(toolPhase(call("input-complete"), cancelled, false)).toBe("stopped");
	});

	it("is stopped when the reply ends without an outcome", () => {
		expect(toolPhase(call("input-streaming"), undefined, false)).toBe("stopped");
		expect(toolPhase(call("input-complete"), undefined, false)).toBe("stopped");
	});
});
