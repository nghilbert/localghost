import { describe, expect, it, vi } from "vitest";
import { ModelStatusFilter } from "#/routes/_authenticated/library/-components/ModelList/ModelStatusFilter";
import { render } from "#/test/utils";

describe("ModelStatusFilter", () => {
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
