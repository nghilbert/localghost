import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatInput } from "#/features/chat/components/ChatInput";
import { render, screen } from "#/test/utils";

describe("ChatInput", () => {
	describe("submission", () => {
		it("should call onSubmit with the message when Enter is pressed", async () => {
			const onSubmit = vi.fn();
			render(<ChatInput onSubmit={onSubmit} isStreaming={false} />);
			const textarea = screen.getByPlaceholderText("Message…");
			await userEvent.type(textarea, "Hello{Enter}");
			expect(onSubmit).toHaveBeenCalledWith("Hello");
		});

		it("should clear the textarea after submission", async () => {
			const onSubmit = vi.fn();
			render(<ChatInput onSubmit={onSubmit} isStreaming={false} />);
			const textarea = screen.getByPlaceholderText("Message…") as HTMLTextAreaElement;
			await userEvent.type(textarea, "Hello{Enter}");
			expect(textarea.value).toBe("");
		});

		it("should not submit on Shift+Enter", async () => {
			const onSubmit = vi.fn();
			render(<ChatInput onSubmit={onSubmit} isStreaming={false} />);
			const textarea = screen.getByPlaceholderText("Message…");
			await userEvent.type(textarea, "Hello{Shift>}{Enter}{/Shift}");
			expect(onSubmit).not.toHaveBeenCalled();
		});

		it("should not submit empty or whitespace-only messages", async () => {
			const onSubmit = vi.fn();
			render(<ChatInput onSubmit={onSubmit} isStreaming={false} />);
			const textarea = screen.getByPlaceholderText("Message…");
			await userEvent.type(textarea, "   {Enter}");
			expect(onSubmit).not.toHaveBeenCalled();
		});
	});

	describe("streaming state", () => {
		it("should show a stop button when isStreaming is true", () => {
			render(<ChatInput onSubmit={vi.fn()} isStreaming={true} />);
			expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
		});

		it("should show a send button when isStreaming is false", () => {
			render(<ChatInput onSubmit={vi.fn()} isStreaming={false} />);
			expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
		});

		it("should call onStop when stop button is clicked", async () => {
			const onStop = vi.fn();
			render(<ChatInput onSubmit={vi.fn()} isStreaming={true} onStop={onStop} />);
			await userEvent.click(screen.getByRole("button", { name: "Stop" }));
			expect(onStop).toHaveBeenCalled();
		});

		it("should not call onSubmit while streaming", async () => {
			const onSubmit = vi.fn();
			render(<ChatInput onSubmit={onSubmit} isStreaming={true} />);
			const textarea = screen.getByPlaceholderText("Message…");
			await userEvent.type(textarea, "Hello");
			expect(onSubmit).not.toHaveBeenCalled();
		});
	});

	describe("disabled state", () => {
		it("should disable the textarea when disabled prop is true", () => {
			render(<ChatInput onSubmit={vi.fn()} isStreaming={false} disabled={true} />);
			expect(screen.getByPlaceholderText("Message…")).toBeDisabled();
		});

		it("should disable the send button when disabled prop is true", () => {
			render(<ChatInput onSubmit={vi.fn()} isStreaming={false} disabled={true} />);
			expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
		});
	});
});
