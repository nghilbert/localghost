import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { Attachment } from "#/routes/_authenticated/_chat/-lib/attachments";
import { render } from "#/test/utils";

vi.mock("#/routes/_authenticated/-components/ChatInput/ModelPicker", () => ({
	ModelPicker: () => null,
}));

const { ChatInput } = await import("#/routes/_authenticated/-components/ChatInput");

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
	sendMessage: (content: string, attachments: Attachment[]) => void;
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

	it("uses a semantic form and sends through both Enter and the submit button", async () => {
		const sendMessage = vi.fn<(content: string, attachments: Attachment[]) => void>();
		const screen = await render(renderInput({ sendMessage }));
		const textarea = screen.getByTestId("chat-input-textarea");

		expect(screen.getByTestId("chat-input-form").element().tagName).toBe("FORM");

		await textarea.fill("First message");
		await userEvent.keyboard("{Enter}");
		await expect.poll(() => sendMessage.mock.calls).toEqual([["First message", []]]);
		await expect.element(textarea).toHaveValue("");

		await textarea.fill("Second message");
		await screen.getByTestId("chat-input-submit").click();
		await expect.poll(() => sendMessage.mock.calls.length).toBe(2);
		expect(sendMessage).toHaveBeenLastCalledWith("Second message", []);
	});

	it("keeps Shift+Enter as a newline without sending", async () => {
		const sendMessage = vi.fn<(content: string, attachments: Attachment[]) => void>();
		const screen = await render(renderInput({ sendMessage }));
		const textarea = screen.getByTestId("chat-input-textarea");

		await textarea.fill("First line");
		await userEvent.keyboard("{Shift>}{Enter}{/Shift}Second line");

		await expect.element(textarea).toHaveValue("First line\nSecond line");
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("does not submit a draft after the composer becomes disabled", async () => {
		const sendMessage = vi.fn<(content: string, attachments: Attachment[]) => void>();
		const screen = await render(renderInput({ sendMessage }));

		await screen.getByTestId("chat-input-textarea").fill("Held draft");
		await screen.rerender(renderInput({ disabled: true, sendMessage }));
		(screen.getByTestId("chat-input-form").element() as HTMLFormElement).requestSubmit();

		await expect.poll(() => sendMessage.mock.calls.length).toBe(0);
	});

	it("uses a non-submit button to stop streaming", async () => {
		const stop = vi.fn();
		const sendMessage = vi.fn<(content: string, attachments: Attachment[]) => void>();
		const screen = await render(renderInput({ isStreaming: true, sendMessage, stop }));
		const button = screen.getByTestId("chat-input-submit");

		await expect.element(button).toHaveAttribute("type", "button");
		await button.click();

		expect(stop).toHaveBeenCalledOnce();
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("submits staged image attachments through the same form path", async () => {
		const sendMessage = vi.fn<(content: string, attachments: Attachment[]) => void>();
		const screen = await render(renderInput({ supportsImages: true, sendMessage }));
		const file = new File(["image bytes"], "cat.png", { type: "image/png" });

		await screen.getByTestId("attach-image-input").upload(file);
		await expect.element(screen.getByTestId("attachment-previews")).toBeVisible();
		await screen.getByTestId("chat-input-textarea").fill("Look");
		await screen.getByTestId("chat-input-submit").click();

		await expect.poll(() => sendMessage.mock.calls.length).toBe(1);
		expect(sendMessage).toHaveBeenCalledWith("Look", [
			expect.objectContaining({ kind: "image", name: "cat.png" }),
		]);
	});
});
