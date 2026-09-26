import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "#/test/utils";
import { ChatRenameForm } from "./ChatRenameForm";

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock("#/features/chat/hooks/use-rename-conversation", () => ({
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

		await screen.getByRole("textbox", { name: "Chat title" }).fill("New title");
		await userEvent.keyboard("{Enter}");

		await expect.poll(() => mutateAsync.mock.calls.length).toBe(1);
		expect(mutateAsync.mock.calls[0]?.[0]).toEqual({ id: "c1", title: "New title" });
		await expect.poll(() => onDone.mock.calls.length).toBe(1);
	});

	it("closes without renaming when the title is unchanged", async () => {
		const onDone = vi.fn();
		const screen = await render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await screen.getByRole("textbox", { name: "Chat title" }).click();
		await userEvent.keyboard("{Enter}");

		await expect.poll(() => onDone.mock.calls.length).toBeGreaterThan(0);
		expect(mutateAsync).not.toHaveBeenCalled();
	});

	it("cancels on Escape without renaming, even after edits", async () => {
		const onDone = vi.fn();
		const screen = await render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await screen.getByRole("textbox", { name: "Chat title" }).fill("Old title changed");
		await userEvent.keyboard("{Escape}");

		await expect.poll(() => onDone.mock.calls.length).toBeGreaterThan(0);
		expect(mutateAsync).not.toHaveBeenCalled();
	});

	it("keeps the editor open when the rename fails", async () => {
		mutateAsync.mockRejectedValue(new Error("Rename failed"));
		const onDone = vi.fn();
		const screen = await render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await screen.getByRole("textbox", { name: "Chat title" }).fill("New title");
		await userEvent.keyboard("{Enter}");

		await expect.poll(() => mutateAsync.mock.calls.length).toBe(1);
		expect(onDone).not.toHaveBeenCalled();
		await expect
			.element(screen.getByRole("textbox", { name: "Chat title" }))
			.toHaveValue("New title");
	});
});
