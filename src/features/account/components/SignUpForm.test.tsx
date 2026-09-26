import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { render } from "#/test/utils";
import { SignUpForm } from "./SignUpForm";

type MutationStub = { mutateAsync: Mock; error: Error | null };

const mocks = vi.hoisted<{ signUp: MutationStub }>(() => ({
	signUp: { mutateAsync: vi.fn(), error: null },
}));

vi.mock("#/features/account/hooks/use-sign-up", () => ({ useSignUp: () => mocks.signUp }));

beforeEach(() => {
	vi.clearAllMocks();
	mocks.signUp.error = null;
	mocks.signUp.mutateAsync.mockResolvedValue(undefined);
});

describe("SignUpForm", () => {
	it("blocks submit when the confirmation does not match", async () => {
		const screen = await render(<SignUpForm />);

		await screen.getByLabelText("Name", { exact: true }).fill("Odysseus");
		await screen.getByLabelText("Email", { exact: true }).fill("odysseus@example.com");
		await screen.getByLabelText("Password", { exact: true }).fill("long enough");
		await screen.getByLabelText("Confirm password", { exact: true }).fill("long enouth");
		await screen.getByRole("button", { name: "Sign up" }).click();

		await expect.element(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
		expect(mocks.signUp.mutateAsync).not.toHaveBeenCalled();
	});

	it("submits the credentials without the confirmation field", async () => {
		const screen = await render(<SignUpForm />);

		await screen.getByLabelText("Name", { exact: true }).fill("Odysseus");
		await screen.getByLabelText("Email", { exact: true }).fill("odysseus@example.com");
		await screen.getByLabelText("Password", { exact: true }).fill("long enough");
		await screen.getByLabelText("Confirm password", { exact: true }).fill("long enough");
		await screen.getByRole("button", { name: "Sign up" }).click();

		await expect
			.poll(() => mocks.signUp.mutateAsync.mock.calls)
			.toEqual([[{ name: "Odysseus", email: "odysseus@example.com", password: "long enough" }]]);
	});

	it("keeps the typed values when sign-up is refused", async () => {
		mocks.signUp.mutateAsync.mockRejectedValue(new Error("Sign-up is closed."));
		const screen = await render(<SignUpForm />);

		await screen.getByLabelText("Name", { exact: true }).fill("Odysseus");
		await screen.getByLabelText("Email", { exact: true }).fill("odysseus@example.com");
		await screen.getByLabelText("Password", { exact: true }).fill("long enough");
		await screen.getByLabelText("Confirm password", { exact: true }).fill("long enough");
		await screen.getByRole("button", { name: "Sign up" }).click();

		await expect.element(screen.getByRole("button", { name: "Sign up" })).toBeEnabled();
		await expect.element(screen.getByLabelText("Name", { exact: true })).toHaveValue("Odysseus");
	});
});
