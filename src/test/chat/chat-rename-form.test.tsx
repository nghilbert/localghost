import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { ChatRenameForm } from "#/routes/_authenticated/-components/AppSidebar/ChatRenameForm";
import { render } from "#/test/utils";

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock("#/shared/domain/conversation/use-conversations", () => ({
	useRenameConversation: () => ({ mutateAsync }),
}));

const conversation = { id: "c1", title: "Old title" };

describe("ChatRenameForm", () => {
	beforeEach(() => {
		mutateAsync.mockReset();
		mutateAsync.mockImplementation((_input, options) => {
			options?.onSuccess?.();
			return Promise.resolve();
		});
	});

	it("renames on Enter when the title changed", async () => {
		const onDone = vi.fn();
		const screen = await render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await screen.getByTestId("chat-rename-input").fill("New title");
		await userEvent.keyboard("{Enter}");

		await expect.poll(() => mutateAsync.mock.calls.length).toBe(1);
		expect(mutateAsync.mock.calls[0]?.[0]).toEqual({ id: "c1", title: "New title" });
		await expect.poll(() => onDone.mock.calls.length).toBe(1);
	});

	it("closes without renaming when the title is unchanged", async () => {
		const onDone = vi.fn();
		const screen = await render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await screen.getByTestId("chat-rename-input").click();
		await userEvent.keyboard("{Enter}");

		await expect.poll(() => onDone.mock.calls.length).toBeGreaterThan(0);
		expect(mutateAsync).not.toHaveBeenCalled();
	});

	it("cancels on Escape without renaming, even after edits", async () => {
		const onDone = vi.fn();
		const screen = await render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await screen.getByTestId("chat-rename-input").fill("Old title changed");
		await userEvent.keyboard("{Escape}");

		await expect.poll(() => onDone.mock.calls.length).toBeGreaterThan(0);
		expect(mutateAsync).not.toHaveBeenCalled();
	});

	it("keeps the editor open when the rename fails", async () => {
		mutateAsync.mockRejectedValue(new Error("Rename failed"));
		const onDone = vi.fn();
		const screen = await render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await screen.getByTestId("chat-rename-input").fill("New title");
		await userEvent.keyboard("{Enter}");

		await expect.poll(() => mutateAsync.mock.calls.length).toBe(1);
		expect(onDone).not.toHaveBeenCalled();
		await expect.element(screen.getByTestId("chat-rename-input")).toHaveValue("New title");
	});
});
