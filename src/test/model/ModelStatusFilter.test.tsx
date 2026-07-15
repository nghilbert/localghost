import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
	type ModelStatus,
	ModelStatusFilter,
} from "#/routes/_authenticated/library/-components/ModelTable/ModelStatusFilter";
import { render } from "#/test/utils";

function Harness() {
	const [status, setStatus] = useState<ModelStatus>("all");
	return (
		<>
			<ModelStatusFilter
				value={status}
				onValueChange={setStatus}
				counts={{ all: 12, installed: 3, available: 9 }}
			/>
			<span data-testid="selected-status">{status}</span>
		</>
	);
}

describe("ModelStatusFilter", () => {
	it("labels each status with its row count", async () => {
		const screen = await render(<Harness />);

		await expect.element(screen.getByTestId("model-status-all")).toHaveTextContent("All12");
		await expect
			.element(screen.getByTestId("model-status-installed"))
			.toHaveTextContent("Installed3");
		await expect
			.element(screen.getByTestId("model-status-available"))
			.toHaveTextContent("Available9");
	});

	it("selects a status when its toggle is pressed", async () => {
		const screen = await render(<Harness />);

		await screen.getByTestId("model-status-installed").click();

		await expect.element(screen.getByTestId("selected-status")).toHaveTextContent("installed");
	});
});
