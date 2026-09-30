import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { render } from "#/test/utils";
import { SignInForm } from "./SignInForm";

type MutationStub = { mutateAsync: Mock; error: Error | null };

const mocks = vi.hoisted<{ signIn: MutationStub }>(() => ({
	signIn: { mutateAsync: vi.fn(), error: null },
}));

vi.mock("#/features/account/hooks/use-sign-in", () => ({ useSignIn: () => mocks.signIn }));

beforeEach(() => {
	vi.clearAllMocks();
	mocks.signIn.error = null;
	mocks.signIn.mutateAsync.mockResolvedValue(undefined);
});

describe("SignInForm", () => {
	it("submits the credentials through mutateAsync", async () => {
		const screen = await render(<SignInForm />);

		await screen.getByLabelText("Email", { exact: true }).fill("odysseus@example.com");
		await screen.getByLabelText("Password", { exact: true }).fill("long enough");
		await screen.getByRole("button", { name: "Sign in" }).click();

		await expect
			.poll(() => mocks.signIn.mutateAsync.mock.calls)
			.toEqual([[{ email: "odysseus@example.com", password: "long enough" }]]);
	});

	it("renders a failed sign-in inline instead of crashing the route", async () => {
		mocks.signIn.error = new Error("Invalid credentials.");
		const screen = await render(<SignInForm />);

		await expect.element(screen.getByRole("alert")).toHaveTextContent("Invalid credentials.");
	});
});
