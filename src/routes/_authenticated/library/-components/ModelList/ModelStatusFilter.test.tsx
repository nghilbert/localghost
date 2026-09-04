import { describe, expect, it, vi } from "vitest";
import { ModelStatusFilter } from "#/routes/_authenticated/library/-components/ModelList/ModelStatusFilter";
import { DropdownMenu, DropdownMenuContent } from "#/shared/components/ui/dropdown-menu";
import { render } from "#/test/utils";

describe("ModelStatusFilter", () => {
	it("calls onValueChange when a status option is pressed", async () => {
		const onValueChange = vi.fn();
		// DropdownMenuRadioItem reads menu context, so it only renders within an open menu,
		// matching how ModelFilterMenu always mounts it (see ModelList/index.tsx).
		const screen = await render(
			<DropdownMenu open modal={false}>
				<DropdownMenuContent>
					<ModelStatusFilter
						value="all"
						counts={{ all: 12, installed: 3, available: 9 }}
						onValueChange={onValueChange}
					/>
				</DropdownMenuContent>
			</DropdownMenu>,
		);

		await screen.getByTestId("model-status-installed").click();

		expect(onValueChange).toHaveBeenCalledWith("installed");
	});
});
