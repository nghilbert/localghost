import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "#/routes/_authenticated/settings/-components/account/ChangePasswordForm";
import { render } from "#/test/utils";

const { changePasswordMutateAsync } = vi.hoisted(() => ({
	changePasswordMutateAsync: vi.fn(),
}));

vi.mock("#/routes/_authenticated/settings/-hooks/use-change-password", () => ({
	useChangePassword: () => ({ mutateAsync: changePasswordMutateAsync }),
}));

beforeEach(() => {
	vi.clearAllMocks();
	changePasswordMutateAsync.mockResolvedValue(undefined);
});

describe("ChangePasswordForm", () => {
	it("resets only after the mutation succeeds", async () => {
		const submission = Promise.withResolvers<void>();
		changePasswordMutateAsync.mockImplementation((_values, options) =>
			submission.promise.then(() => options?.onSuccess?.()),
		);
		const screen = await render(<ChangePasswordForm />);

		await screen.getByTestId("currentPassword-input").fill("old password");
		await screen.getByTestId("newPassword-input").fill("new password");
		await screen.getByTestId("confirmPassword-input").fill("new password");
		await screen.getByTestId("change-password-submit").click();

		await expect.element(screen.getByTestId("change-password-submit")).toBeDisabled();
		await expect.element(screen.getByTestId("currentPassword-input")).toHaveValue("old password");

		submission.resolve();
		await expect.element(screen.getByTestId("change-password-submit")).toBeEnabled();
		await expect.element(screen.getByTestId("currentPassword-input")).toHaveValue("");
		await expect.element(screen.getByTestId("newPassword-input")).toHaveValue("");
	});

	it("retains the entered passwords when the mutation fails", async () => {
		changePasswordMutateAsync.mockRejectedValue(new Error("Password failed"));
		const screen = await render(<ChangePasswordForm />);

		await screen.getByTestId("currentPassword-input").fill("old password");
		await screen.getByTestId("newPassword-input").fill("new password");
		await screen.getByTestId("confirmPassword-input").fill("new password");
		await screen.getByTestId("change-password-submit").click();

		await expect.element(screen.getByTestId("change-password-submit")).toBeEnabled();
		await expect.element(screen.getByTestId("currentPassword-input")).toHaveValue("old password");
		await expect.element(screen.getByTestId("newPassword-input")).toHaveValue("new password");
	});
});
