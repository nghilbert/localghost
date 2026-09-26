import { useState } from "react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { buildModelFacets } from "#/features/library/lib/facets";
import type { CatalogCapability, HideableFit } from "#/features/library/library.schemas";
import { render } from "#/test/utils";
import { ModelFilterMenu } from "./ModelFilterMenu";
import { ModelStatusFilter } from "./ModelStatusFilter";

function FilterHarness() {
	const [licenses, setLicenses] = useState<string[]>([]);
	const [capabilities, setCapabilities] = useState<CatalogCapability[]>([]);
	const [hiddenFits, setHiddenFits] = useState<HideableFit[]>(["wont-fit"]);
	const facets = buildModelFacets({
		availableLicenses: ["apache-2.0", "mit"],
		hiddenFits,
		capabilities,
		licenses,
		onHiddenFitsChange: setHiddenFits,
		onCapabilitiesChange: setCapabilities,
		onLicensesChange: setLicenses,
	});
	return <ModelFilterMenu facets={facets} />;
}

describe("ModelFilterMenu", () => {
	it("counts the default-on fit filter and every facet, and clears them together", async () => {
		const screen = await render(<FilterHarness />);
		const trigger = screen.getByRole("button", { name: /Filter/ });
		await expect.element(trigger).toHaveTextContent(/^Filter1$/);
		await userEvent.click(trigger);

		// A second fit band plus a capability and a license: four active filters.
		await userEvent.click(
			screen.getByRole("menuitemcheckbox", { name: 'Hide "May be too large"' }),
		);
		await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Code" }));
		await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "mit" }));
		await expect.element(trigger).toHaveTextContent(/^Filter4$/);

		await userEvent.click(screen.getByRole("menuitem", { name: "Clear filters" }));
		await expect.element(trigger).toHaveTextContent(/^Filter$/);
		await expect
			.element(screen.getByRole("menuitemcheckbox", { name: `Hide "Won't fit"` }))
			.toHaveAttribute("aria-checked", "false");
		await expect
			.element(screen.getByRole("menuitemcheckbox", { name: "Code" }))
			.toHaveAttribute("aria-checked", "false");
	});

	it("draws the status choice above the facets", async () => {
		const screen = await render(
			<ModelFilterMenu facets={[]}>
				<ModelStatusFilter
					value="all"
					counts={{ all: 12, installed: 3, available: 9 }}
					onValueChange={() => undefined}
				/>
			</ModelFilterMenu>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Filter" }));

		await expect
			.element(screen.getByRole("menuitemradio", { name: "All 12" }))
			.toHaveAttribute("aria-checked", "true");
	});
});
