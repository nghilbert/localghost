import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it } from "vitest";
import { ChatMessage } from "#/features/send-message/components/ChatMessage";
import { render } from "#/test/utils";

function userMessage(content: string): UIMessage {
	return { id: "u1", role: "user", parts: [{ type: "text", content }] };
}

function assistantMessage(content: string): UIMessage {
	return { id: "a1", role: "assistant", parts: [{ type: "text", content }] };
}

describe("ChatMessage", () => {
	describe("user messages", () => {
		it("renders the content as plain text", async () => {
			const screen = await render(<ChatMessage message={userMessage("Hello world")} />);

			await expect.element(screen.getByTestId("chat-message")).toHaveTextContent("Hello world");
		});

		it("renders with an article landmark", async () => {
			const screen = await render(<ChatMessage message={userMessage("Hi")} />);

			await expect.element(screen.getByTestId("chat-message")).toHaveAttribute("role", "article");
		});

		it("renders markdown syntax literally, not parsed", async () => {
			const screen = await render(<ChatMessage message={userMessage("**bold** text")} />);

			await expect.element(screen.getByTestId("chat-message")).toHaveTextContent("**bold** text");
		});

		it("preserves newlines in the message text", async () => {
			const screen = await render(<ChatMessage message={userMessage("line one\nline two")} />);

			expect(screen.getByTestId("chat-message").element().textContent).toBe("line one\nline two");
		});
	});

	describe("assistant messages", () => {
		// Markdown output is rendered by Streamdown, which won't forward testids,
		// so these assertions query the library-rendered text directly.
		it("renders markdown content as formatted HTML", async () => {
			const screen = await render(<ChatMessage message={assistantMessage("**bold text**")} />);

			await expect
				.element(screen.getByText("bold text"))
				.toHaveAttribute("data-streamdown", "strong");
		});

		it("renders with an article landmark", async () => {
			const screen = await render(<ChatMessage message={assistantMessage("Hello")} />);

			await expect.element(screen.getByTestId("chat-message")).toHaveAttribute("role", "article");
		});

		it("renders links that open in a new tab without leaking the opener", async () => {
			const screen = await render(
				<ChatMessage message={assistantMessage("[Link](https://example.com)")} />,
			);

			const link = screen.getByText("Link");
			await expect.element(link).toHaveAttribute("href", "https://example.com/");
			await expect.element(link).toHaveAttribute("target", "_blank");
			await expect.element(link).toHaveAttribute("rel", "noopener noreferrer");
		});

		it("renders inline code", async () => {
			const screen = await render(<ChatMessage message={assistantMessage("`console.log()`")} />);

			await expect.element(screen.getByText("console.log()")).toBeVisible();
		});

		it("renders fenced code blocks", async () => {
			const screen = await render(
				<ChatMessage message={assistantMessage("```js\nconsole.log()\n```")} />,
			);

			await expect.element(screen.getByText("console.log()")).toBeVisible();
		});
	});

	describe("tool calls", () => {
		it("renders a tool-call/result pair as a collapsible with a friendly label", async () => {
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{ type: "text", content: "Let me search." },
					{ type: "tool-call", id: "c1", name: "web_search", arguments: "{}", state: "complete" },
					{ type: "tool-result", toolCallId: "c1", content: "result body", state: "complete" },
				],
			};

			const screen = await render(<ChatMessage message={message} />);

			// The result lives in a collapsed Collapsible (unmounted until opened),
			// so the friendly-labelled trigger is what proves the block rendered.
			await expect
				.element(screen.getByTestId("activity-trail-marker"))
				.toHaveTextContent("Searched the web");
		});

		it("shows a running indicator for an in-flight tool call while streaming", async () => {
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{
						type: "tool-call",
						id: "c1",
						name: "web_search",
						arguments: "{}",
						state: "input-complete",
					},
				],
			};

			const screen = await render(<ChatMessage message={message} isStreaming />);

			await expect
				.element(screen.getByTestId("activity-marker-status"))
				.toHaveTextContent("Searching the web");
		});
	});

	describe("reasoning", () => {
		const message: UIMessage = {
			id: "a1",
			role: "assistant",
			parts: [
				{ type: "thinking", content: "considering options" },
				{ type: "text", content: "answer" },
			],
		};

		it("renders a collapsed reasoning block when thinking parts are present", async () => {
			const screen = await render(<ChatMessage message={message} />);

			await expect
				.element(screen.getByTestId("activity-trail-marker"))
				.toHaveTextContent("Reasoning");
		});

		it("reveals the reasoning text on click and collapses again on a second click", async () => {
			const screen = await render(<ChatMessage message={message} />);
			const trigger = screen.getByTestId("activity-trail-marker");

			await trigger.click();
			await expect.element(screen.getByText("considering options")).toBeVisible();

			await trigger.click();
			await expect.element(screen.getByText("considering options")).not.toBeInTheDocument();
		});
	});

	describe("tool call output", () => {
		it("reveals the tool output on click and collapses again on a second click", async () => {
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{
						type: "tool-call",
						id: "c1",
						name: "web_search",
						arguments: "{}",
						state: "complete",
						output: "top result: otters",
					},
				],
			};

			const screen = await render(<ChatMessage message={message} />);
			const trigger = screen.getByTestId("activity-trail-marker");

			await trigger.click();
			await expect
				.element(screen.getByTestId("tool-call-step-output"))
				.toHaveTextContent("top result: otters");

			await trigger.click();
			await expect.element(screen.getByTestId("tool-call-step-output")).not.toBeInTheDocument();
		});
	});

	describe("activity trail ordering", () => {
		it("renders interleaved reasoning and tool steps in document order", async () => {
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{ type: "thinking", content: "first, let me search" },
					{
						type: "tool-call",
						id: "c1",
						name: "web_search",
						arguments: "{}",
						state: "complete",
						output: "found it",
					},
					{ type: "thinking", content: "now let me answer" },
					{ type: "text", content: "answer" },
				],
			};

			const screen = await render(<ChatMessage message={message} />);

			const markers = screen.getByTestId("activity-trail-marker").elements();
			expect(markers.map((el) => el.textContent)).toEqual([
				expect.stringContaining("Reasoning"),
				expect.stringContaining("Searched the web"),
				expect.stringContaining("Reasoning"),
			]);
		});
	});

	describe("pending head label", () => {
		it("shows the pending label instead of 'Thinking' while the local model loads", async () => {
			const message: UIMessage = { id: "a1", role: "assistant", parts: [] };

			const screen = await render(
				<ChatMessage message={message} isStreaming pendingLabel="Warming up the model" />,
			);

			await expect
				.element(screen.getByTestId("activity-marker-status"))
				.toHaveTextContent("Warming up the model");
		});
	});
});
