import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { SignInForm } from "#/routes/_public/-components/SignInForm";
import { SignUpForm } from "#/routes/_public/-components/SignUpForm";
import { render } from "#/test/utils";

type MutationStub = { mutateAsync: Mock; error: Error | null };

const mocks = vi.hoisted<{ signIn: MutationStub; signUp: MutationStub }>(() => ({
	signIn: { mutateAsync: vi.fn(), error: null },
	signUp: { mutateAsync: vi.fn(), error: null },
}));

vi.mock("#/routes/_public/-hooks/use-sign-in", () => ({ useSignIn: () => mocks.signIn }));
vi.mock("#/routes/_public/-hooks/use-sign-up", () => ({ useSignUp: () => mocks.signUp }));

beforeEach(() => {
	vi.clearAllMocks();
	mocks.signIn.error = null;
	mocks.signUp.error = null;
	mocks.signIn.mutateAsync.mockResolvedValue(undefined);
	mocks.signUp.mutateAsync.mockResolvedValue(undefined);
});

describe("SignInForm", () => {
	it("submits the credentials through mutateAsync", async () => {
		const screen = await render(<SignInForm />);

		await screen.getByTestId("email-input").fill("odysseus@example.com");
		await screen.getByTestId("password-input").fill("long enough");
		await screen.getByTestId("sign-in-submit").click();

		await expect
			.poll(() => mocks.signIn.mutateAsync.mock.calls)
			.toEqual([[{ email: "odysseus@example.com", password: "long enough" }]]);
	});

	it("renders a failed sign-in inline instead of crashing the route", async () => {
		mocks.signIn.error = new Error("Invalid credentials.");
		const screen = await render(<SignInForm />);

		await expect
			.element(screen.getByTestId("form-error"))
			.toHaveTextContent("Invalid credentials.");
	});
});

describe("SignUpForm", () => {
	it("blocks submit when the confirmation does not match", async () => {
		const screen = await render(<SignUpForm />);

		await screen.getByTestId("name-input").fill("Odysseus");
		await screen.getByTestId("email-input").fill("odysseus@example.com");
		await screen.getByTestId("password-input").fill("long enough");
		await screen.getByTestId("confirmPassword-input").fill("long enouth");
		await screen.getByTestId("sign-up-submit").click();

		await expect
			.element(screen.getByTestId("confirmPassword-error"))
			.toHaveTextContent("Passwords do not match");
		expect(mocks.signUp.mutateAsync).not.toHaveBeenCalled();
	});

	it("submits the credentials without the confirmation field", async () => {
		const screen = await render(<SignUpForm />);

		await screen.getByTestId("name-input").fill("Odysseus");
		await screen.getByTestId("email-input").fill("odysseus@example.com");
		await screen.getByTestId("password-input").fill("long enough");
		await screen.getByTestId("confirmPassword-input").fill("long enough");
		await screen.getByTestId("sign-up-submit").click();

		await expect
			.poll(() => mocks.signUp.mutateAsync.mock.calls)
			.toEqual([[{ name: "Odysseus", email: "odysseus@example.com", password: "long enough" }]]);
	});

	it("keeps the typed values when sign-up is refused", async () => {
		mocks.signUp.mutateAsync.mockRejectedValue(new Error("Sign-up is closed."));
		const screen = await render(<SignUpForm />);

		await screen.getByTestId("name-input").fill("Odysseus");
		await screen.getByTestId("email-input").fill("odysseus@example.com");
		await screen.getByTestId("password-input").fill("long enough");
		await screen.getByTestId("confirmPassword-input").fill("long enough");
		await screen.getByTestId("sign-up-submit").click();

		await expect.element(screen.getByTestId("sign-up-submit")).toBeEnabled();
		await expect.element(screen.getByTestId("name-input")).toHaveValue("Odysseus");
	});
});
