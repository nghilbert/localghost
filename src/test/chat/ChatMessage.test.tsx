import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { ChatMessage } from "#/routes/_authenticated/_chat/-components/ChatMessage";
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

		it("renders markdown syntax literally, not parsed", async () => {
			const screen = await render(<ChatMessage message={userMessage("**bold** text")} />);

			await expect.element(screen.getByTestId("chat-message")).toHaveTextContent("**bold** text");
		});

		it("preserves newlines in the message text", async () => {
			const screen = await render(<ChatMessage message={userMessage("line one\nline two")} />);

			expect(screen.getByTestId("chat-message").element().textContent).toBe("line one\nline two");
		});
	});

	describe("editing user messages", () => {
		it("shows no edit button when onEditResend isn't provided", async () => {
			const screen = await render(<ChatMessage message={userMessage("Hi")} />);

			await expect.element(screen.getByTestId("edit-message-button")).not.toBeInTheDocument();
		});

		it("opens an editable textarea prefilled with the message text", async () => {
			const screen = await render(
				<ChatMessage message={userMessage("Original text")} onEditResend={() => {}} />,
			);

			await screen.getByTestId("edit-message-button").click();

			await expect
				.element(screen.getByTestId("edit-message-textarea"))
				.toHaveValue("Original text");
		});

		it("resends the trimmed, edited text on save", async () => {
			let resent: string | null = null;
			const screen = await render(
				<ChatMessage
					message={userMessage("Original text")}
					onEditResend={(content) => {
						resent = content;
					}}
				/>,
			);

			await screen.getByTestId("edit-message-button").click();
			await screen.getByTestId("edit-message-textarea").fill("  Edited text  ");
			await screen.getByTestId("save-edit-button").click();

			expect(resent).toBe("Edited text");
			await expect.element(screen.getByTestId("edit-message-button")).toBeInTheDocument();
		});

		it("cancels back to the original text without resending", async () => {
			let resent = false;
			const screen = await render(
				<ChatMessage
					message={userMessage("Original text")}
					onEditResend={() => {
						resent = true;
					}}
				/>,
			);

			await screen.getByTestId("edit-message-button").click();
			await screen.getByTestId("edit-message-textarea").fill("Something else");
			await screen.getByTestId("cancel-edit-button").click();

			expect(resent).toBe(false);
			await expect.element(screen.getByTestId("chat-message")).toHaveTextContent("Original text");
		});
	});

	describe("assistant messages", () => {
		it("guards link clicks behind a confirmation that shows the real URL", async () => {
			const open = vi.spyOn(window, "open").mockReturnValue(null);
			const screen = await render(
				<ChatMessage message={assistantMessage("[Link](https://example.com)")} />,
			);

			// Link safety renders a guarded button instead of a direct anchor, so a
			// disguised link can't navigate before the destination is revealed.
			const link = screen.getByText("Link");
			await expect.element(link).not.toHaveAttribute("href");
			await link.click();
			await expect
				.element(screen.getByTestId("link-safety-dialog"))
				.toHaveTextContent("https://example.com/");
			expect(open).not.toHaveBeenCalled();

			// No stylesheet loads in browser tests, so Base UI's inline-styled inert
			// backdrop covers the unpositioned popup and swallows pointer clicks;
			// keyboard activation reaches the confirm button regardless.
			await userEvent.tab();
			await expect.element(screen.getByTestId("link-safety-open-button")).toHaveFocus();
			await userEvent.keyboard("{Enter}");
			expect(open).toHaveBeenCalledWith("https://example.com/", "_blank", "noreferrer");
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
