import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Menu } from "#/components/ui/menu";
import { render } from "#/test/utils";
import { ModelStatusFilter } from "./ModelStatusFilter";

describe("ModelStatusFilter", () => {
	it("reports the status picked from the menu, with each status's count", async () => {
		const onValueChange = vi.fn();
		const screen = await render(
			<Menu.Root open>
				<Menu.Content>
					<ModelStatusFilter
						value="all"
						counts={{ all: 1200, installed: 3, available: 1197 }}
						onValueChange={onValueChange}
					/>
				</Menu.Content>
			</Menu.Root>,
		);

		await expect
			.element(screen.getByRole("menuitemradio", { name: "All 1,200" }))
			.toHaveAttribute("aria-checked", "true");
		await userEvent.click(screen.getByRole("menuitemradio", { name: "Installed 3" }));

		expect(onValueChange).toHaveBeenCalledWith("installed");
	});
});
