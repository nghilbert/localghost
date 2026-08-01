import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ModelFilterMenu } from "#/routes/_authenticated/library/-components/ModelList/ModelFilterMenu";
import type { CatalogCapability } from "#/shared/domain/model/schemas";
import { render } from "#/test/utils";

function FilterHarness() {
	const [licenses, setLicenses] = useState<string[]>([]);
	const [capabilities, setCapabilities] = useState<CatalogCapability[]>([]);
	return (
		<ModelFilterMenu
			licenses={["apache-2.0", "mit"]}
			selectedLicenses={licenses}
			selectedCapabilities={capabilities}
			onLicensesChange={setLicenses}
			onCapabilitiesChange={setCapabilities}
		/>
	);
}

describe("ModelFilterMenu", () => {
	it("tracks multiple facets in its badge and clears them together", async () => {
		const screen = await render(<FilterHarness />);
		await screen.getByTestId("model-filter-trigger").click();

		await screen.getByText("Code", { exact: true }).click();
		await screen.getByText("mit", { exact: true }).click();
		await expect.element(screen.getByTestId("model-filter-count")).toHaveTextContent("2");

		await screen.getByTestId("model-filter-clear").click();
		await expect.element(screen.getByTestId("model-filter-count")).not.toBeInTheDocument();
		await expect
			.element(screen.getByTestId("model-filter-capability-code"))
			.toHaveAttribute("aria-checked", "false");
	});
});
