import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "#/routes/_authenticated/settings/-components/account/ChangePasswordForm";
import { ProfileForm } from "#/routes/_authenticated/settings/-components/account/ProfileForm";
import { MemoryCreateForm } from "#/routes/_authenticated/settings/-components/memory/MemoryCreateForm";
import { render } from "#/test/utils";

const { changePasswordMutateAsync, createMemoryMutateAsync, updateAccountMutateAsync } = vi.hoisted(
	() => ({
		changePasswordMutateAsync: vi.fn(),
		createMemoryMutateAsync: vi.fn(),
		updateAccountMutateAsync: vi.fn(),
	}),
);

vi.mock("#/routes/_authenticated/settings/-hooks/use-change-password", () => ({
	useChangePassword: () => ({ mutateAsync: changePasswordMutateAsync }),
}));

vi.mock("#/routes/_authenticated/settings/-hooks/use-update-account", () => ({
	useUpdateAccount: () => ({ mutateAsync: updateAccountMutateAsync }),
}));

vi.mock("#/routes/_authenticated/settings/-hooks/use-memories", () => ({
	useCreateMemory: () => ({ mutateAsync: createMemoryMutateAsync }),
}));

beforeEach(() => {
	vi.clearAllMocks();
	changePasswordMutateAsync.mockResolvedValue(undefined);
	createMemoryMutateAsync.mockResolvedValue(undefined);
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

describe("MemoryCreateForm", () => {
	it("clears a new memory only after it is saved", async () => {
		const submission = Promise.withResolvers<void>();
		createMemoryMutateAsync.mockImplementation((_text, options) =>
			submission.promise.then(() => options?.onSuccess?.()),
		);
		const screen = await render(<MemoryCreateForm />);

		await screen.getByTestId("text-input").fill("  Prefer metric units  ");
		await screen.getByTestId("memory-create-submit").click();

		await expect.poll(() => createMemoryMutateAsync.mock.calls.length).toBe(1);
		expect(createMemoryMutateAsync.mock.calls[0]?.[0]).toBe("Prefer metric units");
		await expect.element(screen.getByTestId("text-input")).toHaveValue("  Prefer metric units  ");

		submission.resolve();
		await expect.element(screen.getByTestId("text-input")).toHaveValue("");
	});

	it("retains a new memory when saving fails", async () => {
		createMemoryMutateAsync.mockRejectedValue(new Error("Memory failed"));
		const screen = await render(<MemoryCreateForm />);

		await screen.getByTestId("text-input").fill("Keep this value");
		await screen.getByTestId("memory-create-submit").click();

		await expect.element(screen.getByTestId("memory-create-submit")).toBeEnabled();
		await expect.element(screen.getByTestId("text-input")).toHaveValue("Keep this value");
	});
});
