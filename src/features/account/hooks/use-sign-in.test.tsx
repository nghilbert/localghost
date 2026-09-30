import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { SignInForm } from "#/features/account/components/SignInForm";
import { worker } from "#/test/msw";
import { renderWithRouter } from "#/test/utils";

async function submitSignIn() {
	const screen = await renderWithRouter(<SignInForm />);
	await userEvent.fill(screen.getByLabelText("Email", { exact: true }), "alex@example.com");
	await userEvent.fill(screen.getByLabelText("Password", { exact: true }), "long enough");
	await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
	return screen;
}

describe("useSignIn", () => {
	it("shows who is signed in when the server refuses a second person", async () => {
		const message =
			"Sam is signed in. They need to sign out, or you can sign in after their session ends.";
		worker.use(
			http.post("/api/auth/sign-in/email", () =>
				HttpResponse.json({ message, code: "FORBIDDEN" }, { status: 403 }),
			),
		);

		const screen = await submitSignIn();

		await expect.element(screen.getByRole("alert")).toHaveTextContent(message);
	});

	it("keeps other failures vague", async () => {
		worker.use(
			http.post("/api/auth/sign-in/email", () =>
				HttpResponse.json(
					{ message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" },
					{ status: 401 },
				),
			),
		);

		const screen = await submitSignIn();

		await expect.element(screen.getByRole("alert")).toHaveTextContent("Invalid credentials.");
	});
});
