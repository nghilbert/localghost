import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "#/test/utils";
import { ChangePasswordForm } from "./ChangePasswordForm";

const { changePasswordMutateAsync } = vi.hoisted(() => ({ changePasswordMutateAsync: vi.fn() }));

vi.mock("#/features/account/hooks/use-change-password", () => ({
	useChangePassword: () => ({ mutateAsync: changePasswordMutateAsync }),
}));

beforeEach(() => {
	vi.clearAllMocks();
	changePasswordMutateAsync.mockResolvedValue(undefined);
});

async function renderAndSubmit() {
	const screen = await render(<ChangePasswordForm />);
	const current = screen.getByLabelText("Current password", { exact: true });
	const next = screen.getByLabelText("New password", { exact: true });
	const submit = screen.getByRole("button", { name: "Change password" });

	await userEvent.fill(current, "old password");
	await userEvent.fill(next, "new password");
	await userEvent.fill(
		screen.getByLabelText("Confirm new password", { exact: true }),
		"new password",
	);
	await userEvent.click(submit);

	return { current, next, submit };
}

describe("ChangePasswordForm", () => {
	it("resets only after the mutation succeeds", async () => {
		const submission = Promise.withResolvers<void>();
		changePasswordMutateAsync.mockImplementation((_values, options) =>
			submission.promise.then(() => options?.onSuccess?.()),
		);
		const { current, next, submit } = await renderAndSubmit();

		await expect.element(submit).toBeDisabled();
		await expect.element(current).toHaveValue("old password");

		submission.resolve();
		await expect.element(submit).toBeEnabled();
		await expect.element(current).toHaveValue("");
		await expect.element(next).toHaveValue("");
	});

	it("retains the entered passwords when the mutation fails", async () => {
		changePasswordMutateAsync.mockRejectedValue(new Error("Password failed"));
		const { current, next, submit } = await renderAndSubmit();

		await expect.element(submit).toBeEnabled();
		await expect.element(current).toHaveValue("old password");
		await expect.element(next).toHaveValue("new password");
	});
});
