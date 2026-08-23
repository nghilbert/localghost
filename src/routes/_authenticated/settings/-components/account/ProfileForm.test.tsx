import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "#/routes/_authenticated/settings/-components/account/ProfileForm";
import { render } from "#/test/utils";

const { updateAccountMutateAsync } = vi.hoisted(() => ({
	updateAccountMutateAsync: vi.fn(),
}));

vi.mock("#/routes/_authenticated/settings/-hooks/use-update-account", () => ({
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

		await screen.getByTestId("name-input").fill("  New name  ");
		await screen.getByTestId("profile-submit").click();

		await expect.poll(() => updateAccountMutateAsync.mock.calls.length).toBe(1);
		expect(updateAccountMutateAsync).toHaveBeenCalledWith({
			name: "New name",
			systemPrompt: "Be concise",
			temperature: 0.7,
		});
	});
});
