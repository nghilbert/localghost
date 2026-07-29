import { describe, expect, it, vi } from "vitest";
import { ModelStatusFilter } from "#/routes/_authenticated/library/-components/ModelList/ModelStatusFilter";
import { render } from "#/test/utils";

describe("ModelStatusFilter", () => {
	it("labels each status with its given count", async () => {
		const screen = await render(
			<ModelStatusFilter
				value="all"
				counts={{ all: 12, installed: 3, available: 9 }}
				onValueChange={vi.fn()}
			/>,
		);

		await expect.element(screen.getByTestId("model-status-all")).toHaveTextContent("All12");
		await expect
			.element(screen.getByTestId("model-status-installed"))
			.toHaveTextContent("Installed3");
		await expect
			.element(screen.getByTestId("model-status-available"))
			.toHaveTextContent("Available9");
	});

	it("calls onValueChange when a status toggle is pressed", async () => {
		const onValueChange = vi.fn();
		const screen = await render(
			<ModelStatusFilter
				value="all"
				counts={{ all: 12, installed: 3, available: 9 }}
				onValueChange={onValueChange}
			/>,
		);

		await screen.getByTestId("model-status-installed").click();

		expect(onValueChange).toHaveBeenCalledWith("installed");
	});
});
