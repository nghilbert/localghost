import { http, HttpResponse } from "msw";
import { describe, expect, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { getUserSettings } from "#/features/account/account.functions";
import { accountQueries } from "#/features/account/account.queries";
import { it, worker } from "#/test/msw";
import { renderWithRouter, testQueryClient } from "#/test/utils";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

vi.mock("#/features/account/account.functions", () => ({
	getUserSettings: vi.fn<typeof getUserSettings>(),
}));

describe("DeleteAccountDialog", () => {
	it("drops the deleted account's cached data", async () => {
		worker.use(http.post("/api/auth/delete-user", () => HttpResponse.json({ success: true })));
		const queryClient = testQueryClient();
		queryClient.setQueryData(accountQueries.settings().queryKey, {
			systemPrompt: "Answer like a pirate",
			temperature: 0.7,
		});
		const screen = await renderWithRouter(<DeleteAccountDialog email="sam@example.com" />, {
			queryClient,
		});

		await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
		await userEvent.fill(screen.getByLabelText(/Type your email/), "sam@example.com");
		await userEvent.click(
			screen.getByRole("alertdialog").getByRole("button", { name: "Delete account" }),
		);

		await expect
			.poll(() => queryClient.getQueryData(accountQueries.settings().queryKey))
			.toBeUndefined();
	});
});
