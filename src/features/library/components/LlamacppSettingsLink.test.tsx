import { describe, expect, it } from "vitest";
import { renderWithRouter } from "#/test/utils";
import { LlamacppSettingsLink } from "./LlamacppSettingsLink";

describe("LlamacppSettingsLink", () => {
	it("links to the llama.cpp section of the Endpoints settings", async () => {
		const screen = await renderWithRouter(
			<LlamacppSettingsLink>Change in Settings</LlamacppSettingsLink>,
		);

		await expect
			.element(screen.getByRole("link", { name: "Change in Settings" }))
			.toHaveAttribute("href", "/settings/endpoints#llamacpp");
	});
});
