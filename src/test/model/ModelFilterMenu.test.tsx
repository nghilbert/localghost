import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ModelFilterMenu } from "#/routes/_authenticated/library/-components/ModelList/ModelFilterMenu";
import { buildModelFacets } from "#/routes/_authenticated/library/-lib/facets";
import type { CatalogCapability, HideableFit } from "#/shared/domain/model/schemas";
import { render } from "#/test/utils";

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
		await expect.element(screen.getByTestId("model-filter-count")).toHaveTextContent("1");
		await screen.getByTestId("model-filter-trigger").click();

		// A second fit band plus a capability and a license: four active filters.
		await screen.getByTestId("model-filter-hide-tight").click();
		await screen.getByTestId("model-filter-capability-code").click();
		await screen.getByTestId("model-filter-license-mit").click();
		await expect.element(screen.getByTestId("model-filter-count")).toHaveTextContent("4");

		await screen.getByTestId("model-filter-clear").click();
		await expect.element(screen.getByTestId("model-filter-count")).not.toBeInTheDocument();
		await expect
			.element(screen.getByTestId("model-filter-hide-wont-fit"))
			.toHaveAttribute("aria-checked", "false");
		await expect
			.element(screen.getByTestId("model-filter-capability-code"))
			.toHaveAttribute("aria-checked", "false");
	});
});
