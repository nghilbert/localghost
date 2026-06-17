import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it } from "vitest";
import { ChatMessage } from "#/features/chat/components/ChatMessage";
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

		it("should render with article landmark and accessible label", () => {
			render(<ChatMessage message={userMessage("Hi")} />);
			expect(screen.getByRole("article", { name: "Your message" })).toBeInTheDocument();
		});

		it("should render markdown syntax literally (not parsed)", () => {
			render(<ChatMessage message={userMessage("**bold** text")} />);
			expect(screen.getByText("**bold** text")).toBeInTheDocument();
		});

		it("should render with whitespace-pre-wrap to preserve newlines", () => {
			const { container } = render(<ChatMessage message={userMessage("line one\nline two")} />);
			const p = container.querySelector("p");
			expect(p).toHaveClass("whitespace-pre-wrap");
			expect(p?.textContent).toBe("line one\nline two");
		});
	});

	describe("assistant messages", () => {
		it("should render markdown content as formatted HTML", () => {
			render(<ChatMessage message={assistantMessage("**bold text**")} />);
			expect(screen.getByText("bold text")).toHaveAttribute("data-streamdown", "strong");
		});

		it("should render with article landmark and accessible label", () => {
			render(<ChatMessage message={assistantMessage("Hello")} />);
			expect(screen.getByRole("article", { name: "Assistant message" })).toBeInTheDocument();
		});

		it("should render links with safe attributes", () => {
			render(<ChatMessage message={assistantMessage("[Link](https://example.com)")} />);
			const link = screen.getByRole("link", { name: "Link" });
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
		it("should render a tool-call/result pair as a collapsible labelled by tool name", () => {
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
			// so the tool-name trigger is what proves the block rendered.
			expect(screen.getByText("web_search")).toBeInTheDocument();
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
			// Reasoning text sits in a collapsed Collapsible; the trigger label
			// proves the block rendered.
			expect(screen.getByText("Reasoning")).toBeInTheDocument();
		});
	});

	describe("streaming indicator", () => {
		it("should show streaming cursor on assistant messages when isStreaming", () => {
			const { container } = render(
				<ChatMessage message={assistantMessage("")} isStreaming={true} />,
			);
			const bubble = container.querySelector("[class*='after:animate-pulse']");
			expect(bubble).toBeInTheDocument();
		});

		it("should not show streaming cursor when isStreaming is false", () => {
			const { container } = render(
				<ChatMessage message={assistantMessage("Done")} isStreaming={false} />,
			);
			const bubble = container.querySelector("[class*='after:animate-pulse']");
			expect(bubble).not.toBeInTheDocument();
		});

		it("should not show streaming cursor on user messages", () => {
			const { container } = render(
				<ChatMessage message={userMessage("typing...")} isStreaming={true} />,
			);
			const bubble = container.querySelector("[class*='after:animate-pulse']");
			expect(bubble).not.toBeInTheDocument();
		});
	});
});
