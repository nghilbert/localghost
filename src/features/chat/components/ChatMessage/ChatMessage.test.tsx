import type { UIMessage } from "@tanstack/ai-client";
import { describe, expect, it, vi } from "vitest";
import { ACTIVITY_STATUS } from "#/features/chat/components/activity-status";
import type { ChatUIMessage } from "#/features/chat/lib/chat-tools";
import { render } from "#/test/utils";
import { ChatMessage } from ".";

function userMessage(content: string): ChatUIMessage {
	return { id: "u1", role: "user", parts: [{ type: "text", content }] };
}

function assistantMessage(content: string): ChatUIMessage {
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
			const message: ChatUIMessage = {
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

		it("says the model is choosing while it writes the call", async () => {
			const message: ChatUIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{
						type: "tool-call",
						id: "c1",
						name: "read_url",
						arguments: '{"url": "https://exa',
						state: "input-streaming",
					},
				],
			};

			const screen = await render(<ChatMessage message={message} isStreaming />);

			await expect.element(screen.getByRole("status")).toHaveTextContent("Choosing a page to open");
		});

		it("says a call cut off by Stop was stopped, not done", async () => {
			const message: ChatUIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{
						type: "tool-call",
						id: "c1",
						name: "read_url",
						arguments: '{"url":"https://example.com/jobs"}',
						input: { url: "https://example.com/jobs" },
						state: "input-complete",
					},
				],
			};

			const screen = await render(<ChatMessage message={message} />);

			await expect
				.element(screen.getByText("Stopped while opening example.com/jobs"))
				.toBeInTheDocument();
		});

		it("names the page read from its title", async () => {
			const message: ChatUIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{
						type: "tool-call",
						id: "c1",
						name: "read_url",
						arguments: '{"url":"https://example.com/jobs"}',
						input: { url: "https://example.com/jobs" },
						state: "input-complete",
						output: "# Job Outlook\n\nHiring is up.",
					},
				],
			};

			const screen = await render(<ChatMessage message={message} />);

			await expect.element(screen.getByText('Read "Job Outlook"')).toBeInTheDocument();
		});

		it("says the model is reading a page it just opened", async () => {
			const message: ChatUIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{
						type: "tool-call",
						id: "c1",
						name: "read_url",
						arguments: "{}",
						state: "input-complete",
						output: "# Job Outlook\n\nHiring is up.",
					},
				],
			};

			const screen = await render(<ChatMessage message={message} isStreaming />);

			await expect.element(screen.getByRole("status")).toHaveTextContent("Reading the page");
		});

		it("labels a tool the app doesn't define by its name", async () => {
			// Untyped, since the model can call a tool outside the typed set.
			const message: UIMessage = {
				id: "a1",
				role: "assistant",
				parts: [
					{ type: "tool-call", id: "c1", name: "do_a_thing", arguments: "{}", state: "complete" },
				],
			};

			const screen = await render(<ChatMessage message={message} />);

			await expect.element(screen.getByText("Ran do_a_thing")).toBeInTheDocument();
		});

		it("shows a running indicator for an in-flight tool call while streaming", async () => {
			const message: ChatUIMessage = {
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
			const message: ChatUIMessage = {
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

			await expect
				.element(screen.getByText("You chose to keep the memory, so it wasn't deleted"))
				.toBeInTheDocument();
			await expect.element(screen.getByText("Deleted a memory")).not.toBeInTheDocument();
		});

		it("shows a failed call's error on click", async () => {
			const message: ChatUIMessage = {
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
			await screen.getByRole("button", { name: "Couldn't search the web" }).click();

			await expect.element(screen.getByText("SearXNG is unreachable")).toBeInTheDocument();
		});
	});

	describe("turn duration", () => {
		it("shows how long the run took from its timings", async () => {
			const message: ChatUIMessage = {
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

		it("says a stopped reply was stopped", async () => {
			const message: ChatUIMessage = {
				...assistantMessage("partial"),
				metadata: { tanstack: { run: { id: "r1", startedAt: 0, finishedAt: 9_000 } } },
			};

			const screen = await render(<ChatMessage message={message} stopped />);

			await expect.element(screen.getByText("Stopped after 9s")).toBeInTheDocument();
		});

		it("says so for a reply stopped before any answer", async () => {
			const message: ChatUIMessage = { id: "a1", role: "assistant", parts: [] };

			const screen = await render(<ChatMessage message={message} stopped />);

			await expect.element(screen.getByText("Stopped")).toBeInTheDocument();
		});
	});

	describe("reasoning", () => {
		const message: ChatUIMessage = {
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
		const message: ChatUIMessage = {
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
			const message: ChatUIMessage = {
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
			const message: ChatUIMessage = {
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
		it("says the model is reading the message before its first output", async () => {
			const message: ChatUIMessage = { id: "a1", role: "assistant", parts: [] };

			const screen = await render(<ChatMessage message={message} isStreaming />);

			await expect.element(screen.getByRole("status")).toHaveTextContent("Reading your message");
		});

		it("shows the pending label while the local model loads", async () => {
			const message: ChatUIMessage = { id: "a1", role: "assistant", parts: [] };

			const screen = await render(
				<ChatMessage message={message} isStreaming pendingStatus={ACTIVITY_STATUS.loadingModel} />,
			);

			await expect
				.element(screen.getByRole("status"))
				.toHaveTextContent("Loading the model into memory");
		});
	});
});
