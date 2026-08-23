import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { SignInForm } from "#/routes/_public/-components/SignInForm";
import { render } from "#/test/utils";

type MutationStub = { mutateAsync: Mock; error: Error | null };

const mocks = vi.hoisted<{ signIn: MutationStub }>(() => ({
	signIn: { mutateAsync: vi.fn(), error: null },
}));

vi.mock("#/routes/_public/-hooks/use-sign-in", () => ({ useSignIn: () => mocks.signIn }));

beforeEach(() => {
	vi.clearAllMocks();
	mocks.signIn.error = null;
	mocks.signIn.mutateAsync.mockResolvedValue(undefined);
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
