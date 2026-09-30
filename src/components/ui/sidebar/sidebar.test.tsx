import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Sidebar } from "#/components/ui/sidebar";
import { render } from "#/test/utils";

function Shell() {
	return (
		<Sidebar.Provider>
			<Sidebar.Root>
				<Sidebar.Content>
					<Sidebar.Menu>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton active tooltip="Library">
								<span>Library</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.Content>
			</Sidebar.Root>
			<Sidebar.Inset>
				<Sidebar.Trigger />
			</Sidebar.Inset>
		</Sidebar.Provider>
	);
}

/** Below the `md` breakpoint the panel is a sheet, opened from the trigger. */
test("opens as a named sheet on a narrow screen", async () => {
	await page.viewport(400, 800);
	await render(<Shell />);

	expect(page.getByRole("dialog").elements()).toHaveLength(0);
	await page.getByRole("button", { name: "Toggle sidebar" }).click();
	await expect.element(page.getByRole("dialog")).toHaveAccessibleName("Sidebar");
	await expect.element(page.getByRole("button", { name: "Library" })).toBeInTheDocument();
});

test("collapses on the desktop with the trigger and with Ctrl+B", async () => {
	await page.viewport(1280, 800);
	const { container } = await render(<Shell />);
	const panel = () => container.querySelector("[data-state]")?.getAttribute("data-state");

	await expect.element(page.getByRole("main")).toBeInTheDocument();
	expect(panel()).toBe("expanded");

	await page.getByRole("button", { name: "Toggle sidebar" }).click();
	await expect.poll(panel).toBe("collapsed");

	await userEvent.keyboard("{Control>}b{/Control}");
	await expect.poll(panel).toBe("expanded");
});

test("marks the active row", async () => {
	await page.viewport(1280, 800);
	await render(<Shell />);

	await expect
		.element(page.getByRole("button", { name: "Library" }))
		.toHaveAttribute("data-active", "");
});
