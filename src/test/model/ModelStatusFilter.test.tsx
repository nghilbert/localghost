import {
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { createModelColumns } from "#/routes/_authenticated/library/-components/ModelTable/columns";
import { ModelStatusFilter } from "#/routes/_authenticated/library/-components/ModelTable/ModelStatusFilter";
import type { ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import { render } from "#/test/utils";

function makeRow(id: string, installed: boolean): ModelRow {
	return {
		id,
		name: id,
		catalog: null,
		installed: installed ? ({ id } as never) : null,
		pullState: undefined,
	};
}

const ROWS: ModelRow[] = [
	makeRow("a", true),
	makeRow("b", true),
	makeRow("c", true),
	makeRow("d", false),
	makeRow("e", false),
	makeRow("f", false),
	makeRow("g", false),
	makeRow("h", false),
	makeRow("i", false),
	makeRow("j", false),
	makeRow("k", false),
	makeRow("l", false),
];

/** A minimal harness wiring the real table instance ModelStatusFilter is designed against. */
function Harness({ globalFilter }: { globalFilter?: string }) {
	const table = useReactTable({
		data: ROWS,
		columns: createModelColumns(),
		state: { globalFilter, columnVisibility: { status: false } },
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
	});
	return (
		<>
			<ModelStatusFilter table={table} />
			<span data-testid="filtered-count">{table.getFilteredRowModel().rows.length}</span>
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

	it("filters the table when a status toggle is pressed", async () => {
		const screen = await render(<Harness />);

		await screen.getByTestId("model-status-installed").click();

		await expect.element(screen.getByTestId("filtered-count")).toHaveTextContent("3");
	});

	it("computes counts from rows already narrowed by the search box, not the unfiltered set", async () => {
		// Only row "a" (installed) contains an "a"; none of b–l do.
		const screen = await render(<Harness globalFilter="a" />);

		await expect.element(screen.getByTestId("model-status-all")).toHaveTextContent("All1");
		await expect
			.element(screen.getByTestId("model-status-installed"))
			.toHaveTextContent("Installed1");
		await expect
			.element(screen.getByTestId("model-status-available"))
			.toHaveTextContent("Available0");
	});
});
