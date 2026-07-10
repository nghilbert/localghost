import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { ChatRenameForm } from "#/routes/_authenticated/-components/AppSidebar/ChatRenameForm";
import { render } from "#/test/utils";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("#/features/send-message/hooks/use-conversations", () => ({
	useConversations: () => ({ renameConversation: { mutate } }),
}));

const conversation = { id: "c1", title: "Old title" };

describe("ChatRenameForm", () => {
	beforeEach(() => mutate.mockClear());

	it("renames on Enter when the title changed", async () => {
		const onDone = vi.fn();
		const screen = await render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await screen.getByTestId("chat-rename-input").fill("New title");
		await userEvent.keyboard("{Enter}");

		await expect.poll(() => mutate.mock.calls).toEqual([[{ id: "c1", title: "New title" }]]);
		expect(onDone).toHaveBeenCalled();
	});

	it("closes without renaming when the title is unchanged", async () => {
		const onDone = vi.fn();
		const screen = await render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await screen.getByTestId("chat-rename-input").click();
		await userEvent.keyboard("{Enter}");

		await expect.poll(() => onDone.mock.calls.length).toBeGreaterThan(0);
		expect(mutate).not.toHaveBeenCalled();
	});

	it("cancels on Escape without renaming, even after edits", async () => {
		const onDone = vi.fn();
		const screen = await render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await screen.getByTestId("chat-rename-input").fill("Old title changed");
		await userEvent.keyboard("{Escape}");

		await expect.poll(() => onDone.mock.calls.length).toBeGreaterThan(0);
		expect(mutate).not.toHaveBeenCalled();
	});
});
