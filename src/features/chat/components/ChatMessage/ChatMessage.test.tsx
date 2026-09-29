import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it, vi } from "vitest";
import { render } from "#/test/utils";
import { ChatMessage } from ".";

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

			await expect
				.element(screen.getByRole("article", { name: "Your message" }))
				.toHaveTextContent("Hello world");
		});

		it("renders markdown syntax literally, not parsed", async () => {
			const screen = await render(<ChatMessage message={userMessage("**bold** text")} />);

			await expect
				.element(screen.getByRole("article", { name: "Your message" }))
				.toHaveTextContent("**bold** text");
		});

		it("preserves newlines in the message text", async () => {
			const screen = await render(<ChatMessage message={userMessage("line one\nline two")} />);

			expect(screen.getByRole("article", { name: "Your message" }).element().textContent).toBe(
				"line one\nline two",
			);
		});
	});

	describe("editing user messages", () => {
		it("shows no edit button when onEditResend isn't provided", async () => {
			const screen = await render(<ChatMessage message={userMessage("Hi")} />);

			await expect
				.element(screen.getByRole("button", { name: "Edit message" }))
				.not.toBeInTheDocument();
		});

		it("opens an editable textarea prefilled with the message text", async () => {
			const screen = await render(
				<ChatMessage message={userMessage("Original text")} onEditResend={() => {}} />,
			);

			await screen.getByRole("button", { name: "Edit message" }).click();

			await expect.element(screen.getByRole("textbox")).toHaveValue("Original text");
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

			await screen.getByRole("button", { name: "Edit message" }).click();
			await screen.getByRole("textbox").fill("  Edited text  ");
			await screen.getByRole("button", { name: "Save & resend" }).click();

			expect(resent).toBe("Edited text");
			await expect
				.element(screen.getByRole("button", { name: "Edit message" }))
				.toBeInTheDocument();
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

			await screen.getByRole("button", { name: "Edit message" }).click();
			await screen.getByRole("textbox").fill("Something else");
			await screen.getByRole("button", { name: "Cancel" }).click();

			expect(resent).toBe(false);
			await expect
				.element(screen.getByRole("article", { name: "Your message" }))
				.toHaveTextContent("Original text");
		});
	});

	describe("assistant messages", () => {
		it("guards link clicks behind a confirmation that shows the real URL", async () => {
			const open = vi.spyOn(window, "open").mockReturnValue(null);
			const screen = await render(
				<ChatMessage message={assistantMessage("[Link](https://example.com)")} />,
			);

			await screen.getByRole("button", { name: "Link" }).click();
			await expect
				.element(screen.getByRole("alertdialog"))
				.toHaveTextContent("https://example.com");
			expect(open).not.toHaveBeenCalled();

			await screen.getByRole("button", { name: "Open link" }).click();
			expect(open).toHaveBeenCalledWith("https://example.com", "_blank", "noreferrer");
		});
	});

	describe("tool calls", () => {
		it("renders a completed call with a friendly label", async () => {
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{ type: "text", content: "Let me search." },
					{ type: "tool-call", id: "c1", name: "web_search", arguments: "{}", state: "complete" },
				],
			};

			const screen = await render(<ChatMessage message={message} />);

			await expect.element(screen.getByText("Searched the web")).toBeInTheDocument();
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

			await expect.element(screen.getByRole("status")).toHaveTextContent("Searching the web");
		});

		it("says a denied call was denied instead of done", async () => {
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{
						type: "tool-call",
						id: "c1",
						name: "delete_memory",
						arguments: "{}",
						state: "complete",
					},
					{
						type: "tool-result",
						toolCallId: "c1",
						content: "",
						state: "error",
						outcome: "denied",
					},
				],
			};

			const screen = await render(<ChatMessage message={message} />);

			await expect.element(screen.getByText("Memory deletion denied")).toBeInTheDocument();
			await expect.element(screen.getByText("Deleted a memory")).not.toBeInTheDocument();
		});

		it("shows a failed call's error on click", async () => {
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{ type: "tool-call", id: "c1", name: "web_search", arguments: "{}", state: "complete" },
					{
						type: "tool-result",
						toolCallId: "c1",
						content: "",
						state: "error",
						error: "SearXNG is unreachable",
					},
				],
			};

			const screen = await render(<ChatMessage message={message} />);
			await screen.getByRole("button", { name: "Web search failed" }).click();

			await expect.element(screen.getByText("SearXNG is unreachable")).toBeInTheDocument();
		});
	});

	describe("turn duration", () => {
		it("shows how long the run took from its timings", async () => {
			const message: UIMessage = {
				...assistantMessage("answer"),
				metadata: { tanstack: { run: { id: "r1", startedAt: 0, finishedAt: 72_000 } } },
			};

			const screen = await render(<ChatMessage message={message} />);

			await expect.element(screen.getByText("Worked for 1m 12s")).toBeInTheDocument();
		});

		it("shows nothing without timings", async () => {
			const screen = await render(<ChatMessage message={assistantMessage("answer")} />);

			await expect.element(screen.getByText(/Worked for/)).not.toBeInTheDocument();
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

			await expect.element(screen.getByRole("button", { name: "Reasoning" })).toBeInTheDocument();
		});

		it("reveals the reasoning text on click and collapses again on a second click", async () => {
			const screen = await render(<ChatMessage message={message} />);
			const trigger = screen.getByRole("button", { name: "Reasoning" });

			await trigger.click();
			await expect.element(screen.getByText("considering options")).toBeVisible();

			await trigger.click();
			await expect.element(screen.getByText("considering options")).not.toBeInTheDocument();
		});
	});

	describe("answer written into reasoning", () => {
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
					output: "results",
				},
				{ type: "thinking", content: "The answer is 42" },
			],
		};

		it("shows a finished reply's last thinking as its answer", async () => {
			const screen = await render(<ChatMessage message={message} />);

			await expect.element(screen.getByText("The answer is 42")).toBeVisible();
			await expect
				.element(screen.getByRole("button", { name: "Copy message" }))
				.toBeInTheDocument();
			await expect
				.element(screen.getByRole("button", { name: "Reasoning" }))
				.not.toBeInTheDocument();
		});

		it("keeps it as thinking while the reply streams", async () => {
			const screen = await render(<ChatMessage message={message} isStreaming />);

			await expect.element(screen.getByRole("status")).toHaveTextContent("Thinking");
			await expect
				.element(screen.getByRole("button", { name: "Copy message" }))
				.not.toBeInTheDocument();
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
			const trigger = screen.getByRole("button", { name: "Searched the web" });

			await trigger.click();
			await expect.element(screen.getByText("top result: otters")).toBeInTheDocument();

			await trigger.click();
			await expect.element(screen.getByText("top result: otters")).not.toBeInTheDocument();
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

			const markers = screen.getByRole("button", { name: /Reasoning|Searched the web/ }).elements();
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

			await expect.element(screen.getByRole("status")).toHaveTextContent("Warming up the model");
		});
	});
});
