import { http, HttpResponse } from "msw";
import { describe, expect, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { getUserSettings } from "#/features/account/account.functions";
import { accountQueries } from "#/features/account/account.queries";
import { SignInForm } from "#/features/account/components/SignInForm";
import { it, worker } from "#/test/msw";
import { renderWithRouter, testQueryClient } from "#/test/utils";

vi.mock("#/features/account/account.functions", () => ({
	getUserSettings: vi.fn<typeof getUserSettings>(),
}));

async function submitSignIn(queryClient = testQueryClient()) {
	const screen = await renderWithRouter(<SignInForm />, { queryClient });
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

	it("drops data cached for whoever used the app before", async () => {
		worker.use(
			http.post("/api/auth/sign-in/email", () =>
				HttpResponse.json({ redirect: false, token: "t" }),
			),
		);
		const queryClient = testQueryClient();
		queryClient.setQueryData(accountQueries.settings().queryKey, {
			systemPrompt: "Answer like a pirate",
			temperature: 0.7,
		});

		const screen = await submitSignIn(queryClient);

		await expect.element(screen.getByText("home")).toBeVisible();
		expect(queryClient.getQueryData(accountQueries.settings().queryKey)).toBeUndefined();
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
