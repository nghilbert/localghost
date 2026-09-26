import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { ThemeProvider } from "#/lib/theme/theme-provider";
import { renderWithRouter } from "#/test/utils";
import { AppearanceTab } from "./AppearanceTab";

/** The background of the palette swatch drawn beside a theme's radio. */
function swatchBackground(radio: Element) {
	const swatch = radio.closest("label")?.querySelector("[data-theme]");
	return swatch ? getComputedStyle(swatch).backgroundColor : null;
}

describe("AppearanceTab", () => {
	it("keeps the Default preview on the default palette while a preset is applied", async () => {
		const screen = await renderWithRouter(
			<ThemeProvider>
				<AppearanceTab />
			</ThemeProvider>,
		);
		const defaultRadio = screen.getByRole("radio", { name: "Default" });
		const presetRadio = screen.getByRole("radio", { name: "T3 Chat" });
		await expect.element(defaultRadio).toBeInTheDocument();
		const defaultBefore = swatchBackground(defaultRadio.element());

		await userEvent.click(presetRadio);

		await expect.poll(() => document.documentElement.dataset.theme).toBe("t3-chat");
		expect(swatchBackground(defaultRadio.element())).toBe(defaultBefore);
		expect(swatchBackground(presetRadio.element())).not.toBe(defaultBefore);
	});
});
