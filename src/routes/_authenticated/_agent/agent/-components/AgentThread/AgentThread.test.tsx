import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { CODE_AGENT_APPROVAL_EVENT } from "#/shared/domain/code-agent/approval";
import type { CodeAgentSessionDetail } from "#/shared/domain/code-agent/code-agent.functions";
import { worker } from "#/test/msw";
import { render } from "#/test/utils";
import { AgentThread } from "./index";

// `requestCodeAgentRunCancel` is a real `createServerFn` client stub; only the type import
// above is needed, and the runtime module pulls in Start's server-fn machinery this browser
// test does not have wired up.
vi.mock("#/shared/domain/code-agent/code-agent.functions", () => ({
	requestCodeAgentRunCancel: vi.fn().mockResolvedValue(undefined),
}));

// AgentThread renders `ChatInput` with `locked`, so `ModelPicker` never actually mounts, but
// it is still statically imported; mocked the same way `ChatInput.test.tsx` does, since its
// real module needs a router this browser test does not have wired up.
vi.mock("#/routes/_authenticated/-components/ChatInput/ModelPicker", () => ({
	ModelPicker: () => null,
}));

const SESSION_ID = "0198c0de-0000-7000-8000-000000000001";

const session: CodeAgentSessionDetail = {
	id: SESSION_ID,
	ownerId: "user-1",
	title: "Session",
	workspacePath: "/workspace",
	endpointId: "endpoint-1",
	endpoint: { id: "endpoint-1", name: "Local", url: "http://localhost:8080", provider: "llamacpp" },
	harness: "claude-code",
	model: "qwen3.5",
	updatedAt: new Date(),
	messages: [],
	hasRun: true,
};

type StreamEvent = Record<string, unknown> & { type: string };

function sseResponse(events: StreamEvent[]) {
	const body = events
		.map((event) => `data: ${JSON.stringify({ timestamp: Date.now(), ...event })}\n\n`)
		.join("");
	return new HttpResponse(body, {
		headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
	});
}

function runWithApproval(): StreamEvent[] {
	return [
		{ type: "RUN_STARTED", threadId: SESSION_ID, runId: "r1" },
		{
			type: "CUSTOM",
			name: CODE_AGENT_APPROVAL_EVENT,
			value: { approvalId: "cmd:command:rm -rf /tmp/x", title: "rm -rf /tmp/x" },
		},
		{ type: "RUN_FINISHED", threadId: SESSION_ID, runId: "r1" },
	];
}

// `onFinish` (the hook this fix relies on) only fires once a run produces an assistant
// message, so a run with none never clears a grant: give every run a minimal reply.
function textRun(runId: string): StreamEvent[] {
	const messageId = `msg-${runId}`;
	return [
		{ type: "RUN_STARTED", threadId: SESSION_ID, runId },
		{ type: "TEXT_MESSAGE_START", messageId, role: "assistant" },
		{ type: "TEXT_MESSAGE_CONTENT", messageId, delta: "done" },
		{ type: "TEXT_MESSAGE_END", messageId },
		{ type: "RUN_FINISHED", threadId: SESSION_ID, runId },
	];
}

beforeEach(() => {
	worker.use(
		http.get("/api/agent/stream", () =>
			HttpResponse.json({ messages: [], activeRun: null, interrupts: null }),
		),
	);
});

describe("AgentThread's approval grants", () => {
	it("does not resend a grant once the run it was approved for finishes", async () => {
		const postedBodies: Record<string, unknown>[] = [];
		let call = 0;
		worker.use(
			http.post("/api/agent/stream", async ({ request }) => {
				const body: Record<string, unknown> = {};
				Object.assign(body, await request.json());
				postedBodies.push(body);
				call += 1;
				return call === 1 ? sseResponse(runWithApproval()) : sseResponse(textRun(`r${call}`));
			}),
		);

		function lastPostedApprovalIds(): unknown {
			const forwardedProps = postedBodies.at(-1)?.forwardedProps;
			if (typeof forwardedProps !== "object" || forwardedProps === null) return undefined;
			return Object.entries(forwardedProps).find(([key]) => key === "approvedApprovalIds")?.[1];
		}

		const screen = await render(<AgentThread session={session} />);
		const textarea = screen.getByTestId("chat-input-textarea");
		// Enter, not a click on the submit button: the autoscrolling message list keeps that
		// button scrolling in and out of the viewport, which makes a click on it flaky here.
		await textarea.fill("look around");
		await userEvent.keyboard("{Enter}");

		await expect.element(screen.getByTestId("command-approval-approve")).toBeInTheDocument();
		await screen.getByTestId("command-approval-approve").click();

		// The grant rides the re-run it was approved for...
		await expect.poll(lastPostedApprovalIds).toEqual(["cmd:command:rm -rf /tmp/x"]);
		// ...and once that re-run's reply lands (the point `onFinish` clears the grant)...
		await expect.element(screen.getByText("done")).toBeInTheDocument();

		// ...a later run must not carry it forward.
		await textarea.fill("do something else");
		await userEvent.keyboard("{Enter}");
		await expect.poll(lastPostedApprovalIds).toEqual([]);
	});
});
