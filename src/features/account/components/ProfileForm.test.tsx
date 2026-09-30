import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "#/test/utils";
import { ProfileForm } from "./ProfileForm";

const { updateAccountMutateAsync } = vi.hoisted(() => ({ updateAccountMutateAsync: vi.fn() }));

vi.mock("#/features/account/hooks/use-update-account", () => ({
	useUpdateAccount: () => ({ mutateAsync: updateAccountMutateAsync }),
}));

beforeEach(() => {
	vi.clearAllMocks();
	updateAccountMutateAsync.mockResolvedValue(undefined);
});

describe("ProfileForm", () => {
	it("submits trimmed profile values through mutateAsync", async () => {
		const screen = await render(
			<ProfileForm
				name="Old name"
				email="person@example.com"
				systemPrompt="Be concise"
				temperature={0.7}
			/>,
		);

		await userEvent.fill(screen.getByRole("textbox", { name: "Name" }), "  New name  ");
		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		await expect.poll(() => updateAccountMutateAsync.mock.calls.length).toBe(1);
		expect(updateAccountMutateAsync).toHaveBeenCalledWith({
			name: "New name",
			systemPrompt: "Be concise",
			temperature: 0.7,
		});
	});
});
