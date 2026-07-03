import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatRenameForm } from "#/components/AppSidebar/ChatRenameForm";
import { render, screen } from "#/test/utils";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("#/features/chat/hooks/use-conversations", () => ({
	useConversations: () => ({ renameConversation: { mutate } }),
}));

const conversation = { id: "c1", title: "Old title" };

describe("ChatRenameForm", () => {
	beforeEach(() => mutate.mockClear());

	it("renames on Enter when the title changed", async () => {
		const user = userEvent.setup();
		const onDone = vi.fn();
		render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		const input = screen.getByLabelText("Chat title");
		await user.clear(input);
		await user.type(input, "New title{Enter}");

		expect(mutate).toHaveBeenCalledWith({ id: "c1", title: "New title" });
		expect(onDone).toHaveBeenCalled();
	});

	it("closes without renaming when the title is unchanged", async () => {
		const user = userEvent.setup();
		const onDone = vi.fn();
		render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await user.type(screen.getByLabelText("Chat title"), "{Enter}");

		expect(mutate).not.toHaveBeenCalled();
		expect(onDone).toHaveBeenCalled();
	});

	it("cancels on Escape without renaming", async () => {
		const user = userEvent.setup();
		const onDone = vi.fn();
		render(<ChatRenameForm conversation={conversation} onDone={onDone} />);

		await user.type(screen.getByLabelText("Chat title"), " changed{Escape}");

		expect(mutate).not.toHaveBeenCalled();
		expect(onDone).toHaveBeenCalled();
	});
});
