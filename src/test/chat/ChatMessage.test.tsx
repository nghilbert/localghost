import type { UIMessage } from "@tanstack/ai-client";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChatMessage } from "#/features/send-message/components/ChatMessage";
import { render, screen } from "#/test/utils";

function userMessage(content: string): UIMessage {
	return { id: "u1", role: "user", parts: [{ type: "text", content }] };
}

function assistantMessage(content: string): UIMessage {
	return { id: "a1", role: "assistant", parts: [{ type: "text", content }] };
}

describe("ChatMessage", () => {
	describe("user messages", () => {
		it("should render content as plain text", () => {
			render(<ChatMessage message={userMessage("Hello world")} />);
			expect(screen.getByText("Hello world")).toBeInTheDocument();
		});

		it("should render with an article landmark", () => {
			render(<ChatMessage message={userMessage("Hi")} />);
			expect(screen.getByTestId("chat-message")).toHaveAttribute("role", "article");
		});

		it("should render markdown syntax literally (not parsed)", () => {
			render(<ChatMessage message={userMessage("**bold** text")} />);
			expect(screen.getByText("**bold** text")).toBeInTheDocument();
		});

		it("preserves newlines in the message text", () => {
			render(<ChatMessage message={userMessage("line one\nline two")} />);
			expect(screen.getByTestId("chat-message").textContent).toBe("line one\nline two");
		});
	});

	describe("assistant messages", () => {
		it("should render markdown content as formatted HTML", () => {
			render(<ChatMessage message={assistantMessage("**bold text**")} />);
			expect(screen.getByText("bold text")).toHaveAttribute("data-streamdown", "strong");
		});

		it("should render with an article landmark", () => {
			render(<ChatMessage message={assistantMessage("Hello")} />);
			expect(screen.getByTestId("chat-message")).toHaveAttribute("role", "article");
		});

		it("should render links with safe attributes", () => {
			render(<ChatMessage message={assistantMessage("[Link](https://example.com)")} />);
			const link = screen.getByText("Link");
			expect(link).toHaveAttribute("href", "https://example.com/");
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
		});

		it("should render inline code", () => {
			render(<ChatMessage message={assistantMessage("`console.log()`")} />);
			expect(screen.getByText("console.log()")).toBeInTheDocument();
		});

		it("should render fenced code blocks", () => {
			render(<ChatMessage message={assistantMessage("```js\nconsole.log()\n```")} />);
			expect(screen.getByText("console.log()")).toBeInTheDocument();
		});
	});

	describe("tool calls", () => {
		it("should render a tool-call/result pair as a collapsible with a friendly label", () => {
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{ type: "text", content: "Let me search." },
					{ type: "tool-call", id: "c1", name: "web_search", arguments: "{}", state: "complete" },
					{ type: "tool-result", toolCallId: "c1", content: "result body", state: "complete" },
				],
			};
			render(<ChatMessage message={message} />);
			// The result lives in a collapsed Collapsible (unmounted until opened),
			// so the friendly-labelled trigger is what proves the block rendered.
			expect(screen.getByTestId("activity-trail-marker")).toHaveTextContent("Searched the web");
		});

		it("should show a running indicator for an in-flight tool call while streaming", () => {
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
			render(<ChatMessage message={message} isStreaming />);
			expect(screen.getByTestId("activity-marker-status")).toHaveTextContent("Searching the web");
		});
	});

	describe("reasoning", () => {
		it("should render a reasoning block when thinking parts are present", () => {
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{ type: "thinking", content: "considering options" },
					{ type: "text", content: "answer" },
				],
			};
			render(<ChatMessage message={message} />);
			// Reasoning text sits collapsed behind a marker; the trigger label
			// proves the block rendered.
			expect(screen.getByTestId("activity-trail-marker")).toHaveTextContent("Reasoning");
		});

		it("reveals the reasoning text on click and collapses again on a second click", async () => {
			const user = userEvent.setup();
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{ type: "thinking", content: "considering options" },
					{ type: "text", content: "answer" },
				],
			};
			render(<ChatMessage message={message} />);

			const trigger = screen.getByTestId("activity-trail-marker");
			await user.click(trigger);
			expect(screen.getByText("considering options")).toBeInTheDocument();

			await user.click(trigger);
			expect(screen.queryByText("considering options")).not.toBeInTheDocument();
		});
	});

	describe("tool call output", () => {
		it("reveals the tool output on click and collapses again on a second click", async () => {
			const user = userEvent.setup();
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
			render(<ChatMessage message={message} />);

			const trigger = screen.getByTestId("activity-trail-marker");
			await user.click(trigger);
			expect(screen.getByTestId("tool-call-step-output")).toHaveTextContent("top result: otters");

			await user.click(trigger);
			expect(screen.queryByTestId("tool-call-step-output")).not.toBeInTheDocument();
		});
	});

	describe("activity trail ordering", () => {
		it("renders interleaved reasoning and tool steps in document order", () => {
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
			render(<ChatMessage message={message} />);

			const markers = screen.getAllByTestId("activity-trail-marker");
			expect(markers.map((el) => el.textContent)).toEqual([
				expect.stringContaining("Reasoning"),
				expect.stringContaining("Searched the web"),
				expect.stringContaining("Reasoning"),
			]);
		});
	});

	describe("warming", () => {
		it("shows 'Warming up the model' instead of 'Thinking' while the local model loads", () => {
			const message: UIMessage = { id: "a1", role: "assistant", parts: [] };
			render(<ChatMessage message={message} isStreaming warming />);
			expect(screen.getByTestId("activity-marker-status")).toHaveTextContent(
				"Warming up the model",
			);
		});
	});
});
