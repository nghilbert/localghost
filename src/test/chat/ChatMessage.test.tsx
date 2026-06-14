import { describe, expect, it } from "vitest";
import { ChatMessage } from "#/features/chat/components/ChatMessage";
import { render, screen } from "#/test/utils";

describe("ChatMessage", () => {
	describe("user messages", () => {
		it("should render content as plain text", () => {
			render(<ChatMessage senderRole="user" content="Hello world" />);
			expect(screen.getByText("Hello world")).toBeInTheDocument();
		});

		it("should render with article landmark and accessible label", () => {
			render(<ChatMessage senderRole="user" content="Hi" />);
			expect(screen.getByRole("article", { name: "Your message" })).toBeInTheDocument();
		});

		it("should render markdown syntax literally (not parsed)", () => {
			render(<ChatMessage senderRole="user" content="**bold** text" />);
			expect(screen.getByText("**bold** text")).toBeInTheDocument();
		});

		it("should render with whitespace-pre-wrap to preserve newlines", () => {
			const { container } = render(
				<ChatMessage senderRole="user" content={"line one\nline two"} />,
			);
			const p = container.querySelector("p");
			expect(p).toHaveClass("whitespace-pre-wrap");
			expect(p?.textContent).toBe("line one\nline two");
		});
	});

	describe("assistant messages", () => {
		it("should render markdown content as formatted HTML", () => {
			render(<ChatMessage senderRole="assistant" content="**bold text**" />);
			expect(screen.getByText("bold text")).toHaveAttribute("data-streamdown", "strong");
		});

		it("should render with article landmark and accessible label", () => {
			render(<ChatMessage senderRole="assistant" content="Hello" />);
			expect(screen.getByRole("article", { name: "Assistant message" })).toBeInTheDocument();
		});

		it("should render links with safe attributes", () => {
			render(<ChatMessage senderRole="assistant" content="[Link](https://example.com)" />);
			const link = screen.getByRole("link", { name: "Link" });
			expect(link).toHaveAttribute("href", "https://example.com/");
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
		});

		it("should render inline code", () => {
			render(<ChatMessage senderRole="assistant" content="`console.log()`" />);
			expect(screen.getByText("console.log()")).toBeInTheDocument();
		});

		it("should render fenced code blocks", () => {
			render(<ChatMessage senderRole="assistant" content={"```js\nconsole.log()\n```"} />);
			expect(screen.getByText("console.log()")).toBeInTheDocument();
		});
	});

	describe("streaming indicator", () => {
		it("should show streaming cursor on assistant messages when isStreaming", () => {
			const { container } = render(
				<ChatMessage senderRole="assistant" content="" isStreaming={true} />,
			);
			const bubble = container.querySelector("[class*='after:animate-pulse']");
			expect(bubble).toBeInTheDocument();
		});

		it("should not show streaming cursor when isStreaming is false", () => {
			const { container } = render(
				<ChatMessage senderRole="assistant" content="Done" isStreaming={false} />,
			);
			const bubble = container.querySelector("[class*='after:animate-pulse']");
			expect(bubble).not.toBeInTheDocument();
		});

		it("should not show streaming cursor on user messages", () => {
			const { container } = render(
				<ChatMessage senderRole="user" content="typing..." isStreaming={true} />,
			);
			const bubble = container.querySelector("[class*='after:animate-pulse']");
			expect(bubble).not.toBeInTheDocument();
		});
	});
});
