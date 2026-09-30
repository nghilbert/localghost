import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { Attachment } from "#/features/chat/lib/attachments";
import { render } from "#/test/utils";

vi.mock("./ModelPicker", () => ({
	ModelPicker: () => null,
}));

const { ChatInput } = await import(".");

type SendMessage = (message: { content: string; attachments: Attachment[] }) => void;

const selection = { endpointId: "endpoint-1", model: "test-model" };

function renderInput({
	disabled = false,
	isStreaming = false,
	supportsImages = false,
	sendMessage,
	stop,
}: {
	disabled?: boolean;
	isStreaming?: boolean;
	supportsImages?: boolean;
	sendMessage: SendMessage;
	stop?: () => void;
}) {
	return (
		<ChatInput
			disabled={disabled}
			isStreaming={isStreaming}
			selection={selection}
			locked
			supportsImages={supportsImages}
			sendMessage={sendMessage}
			stop={stop}
		/>
	);
}

describe("ChatInput", () => {
	beforeEach(() => vi.clearAllMocks());

	it("sends through both Enter and the submit button", async () => {
		const sendMessage = vi.fn<SendMessage>();
		const screen = await render(renderInput({ sendMessage }));
		const textarea = screen.getByRole("textbox", { name: "Message" });

		await textarea.fill("First message");
		await userEvent.keyboard("{Enter}");
		await expect
			.poll(() => sendMessage.mock.calls)
			.toEqual([[{ content: "First message", attachments: [] }]]);
		await expect.element(textarea).toHaveValue("");

		await textarea.fill("Second message");
		await screen.getByRole("button", { name: "Send" }).click();
		await expect.poll(() => sendMessage.mock.calls.length).toBe(2);
		expect(sendMessage).toHaveBeenLastCalledWith({ content: "Second message", attachments: [] });
	});

	it("keeps Shift+Enter as a newline without sending", async () => {
		const sendMessage = vi.fn<SendMessage>();
		const screen = await render(renderInput({ sendMessage }));
		const textarea = screen.getByRole("textbox", { name: "Message" });

		await textarea.fill("First line");
		await userEvent.keyboard("{Shift>}{Enter}{/Shift}Second line");

		await expect.element(textarea).toHaveValue("First line\nSecond line");
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("does not submit a draft after the composer becomes disabled", async () => {
		const sendMessage = vi.fn<SendMessage>();
		const screen = await render(renderInput({ sendMessage }));

		await screen.getByRole("textbox", { name: "Message" }).fill("Held draft");
		await screen.rerender(renderInput({ disabled: true, sendMessage }));
		// The submit button is aria-disabled rather than unmounted, which also blocks a
		// real click; requestSubmit exercises the same disabled-guard in `submit()`.
		const form = screen.getByRole("form", { name: "Send a message" }).element();
		if (form instanceof HTMLFormElement) form.requestSubmit();

		await expect.poll(() => sendMessage.mock.calls.length).toBe(0);
	});

	it("uses a non-submit button to stop streaming", async () => {
		const stop = vi.fn();
		const sendMessage = vi.fn<SendMessage>();
		const screen = await render(renderInput({ isStreaming: true, sendMessage, stop }));
		const button = screen.getByRole("button", { name: "Stop" });

		await expect.element(button).toHaveAttribute("type", "button");
		await button.click();

		expect(stop).toHaveBeenCalledOnce();
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("submits staged image attachments through the same form path", async () => {
		const sendMessage = vi.fn<SendMessage>();
		const screen = await render(renderInput({ supportsImages: true, sendMessage }));
		const file = new File(["image bytes"], "cat.png", { type: "image/png" });

		await screen.getByLabelText("Attach images file").upload(file);
		await expect.element(screen.getByRole("list", { name: "Attachments" })).toBeVisible();
		await screen.getByRole("textbox", { name: "Message" }).fill("Look");
		await screen.getByRole("button", { name: "Send" }).click();

		await expect.poll(() => sendMessage.mock.calls.length).toBe(1);
		expect(sendMessage).toHaveBeenCalledWith({
			content: "Look",
			attachments: [expect.objectContaining({ kind: "image", name: "cat.png" })],
		});
	});
});
