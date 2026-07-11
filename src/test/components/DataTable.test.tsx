import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-react";
import { DataTable } from "#/shared/components/DataTable";
import { DataTableColumnHeader } from "#/shared/components/DataTable/DataTableColumnHeader";
import { render } from "#/test/utils";

type Fruit = { name: string; count: number };

const fruits: Fruit[] = [
	{ name: "banana", count: 5 },
	{ name: "apple", count: 2 },
	{ name: "cherry", count: 9 },
];

const columns: ColumnDef<Fruit>[] = [
	{
		id: "name",
		accessorFn: (row) => row.name,
		header: "Name",
	},
	{
		id: "count",
		accessorFn: (row) => row.count,
		header: ({ column }) => <DataTableColumnHeader column={column} title="Count" />,
	},
];

/** First-cell text of every rendered row, i.e. the visible row order. */
function rowTexts(screen: RenderResult) {
	return screen
		.getByTestId("data-table-row")
		.all()
		.map((row) => row.getByTestId("data-table-cell").first().element().textContent);
}

describe("DataTable", () => {
	it("renders one row per data item in the given order", async () => {
		const screen = await render(<DataTable columns={columns} data={fruits} />);

		await expect.poll(() => rowTexts(screen)).toEqual(["banana", "apple", "cherry"]);
	});

	it("shows the empty message when there is no data", async () => {
		const screen = await render(
			<DataTable columns={columns} data={[]} emptyMessage="Nothing here." />,
		);

		await expect.element(screen.getByTestId("data-table-empty")).toHaveTextContent("Nothing here.");
	});

	it("applies initial sorting", async () => {
		const screen = await render(
			<DataTable columns={columns} data={fruits} initialSorting={[{ id: "count", desc: true }]} />,
		);

		await expect.poll(() => rowTexts(screen)).toEqual(["cherry", "banana", "apple"]);
	});

	it("sorts ascending when a sortable column header is clicked", async () => {
		const screen = await render(<DataTable columns={columns} data={fruits} />);

		await screen.getByTestId("data-table-sort-count").click();

		await expect.poll(() => rowTexts(screen)).toEqual(["apple", "banana", "cherry"]);
	});

	it("filters rows via the controlled global filter", async () => {
		const screen = await render(<DataTable columns={columns} data={fruits} globalFilter="cher" />);

		await expect.poll(() => rowTexts(screen)).toEqual(["cherry"]);
	});

	it("applies getRowClassName to data rows", async () => {
		const screen = await render(
			<DataTable
				columns={columns}
				data={fruits}
				getRowClassName={(row) => (row.name === "apple" ? "test-highlight" : undefined)}
			/>,
		);

		const rows = screen.getByTestId("data-table-row").elements();
		const appleRow = rows.find((row) => row.textContent?.includes("apple"));
		if (!appleRow) throw new Error("expected a row for apple");
		expect(appleRow.classList.contains("test-highlight")).toBe(true);
	});

	it("paginates rows and advances page via the next-page control", async () => {
		const screen = await render(<DataTable columns={columns} data={fruits} pageSize={2} />);

		await expect.poll(() => rowTexts(screen)).toEqual(["banana", "apple"]);

		// Pagination renders above and below the table, so two identical controls exist.
		await screen.getByTestId("data-table-next-page").first().click();

		await expect.poll(() => rowTexts(screen)).toEqual(["cherry"]);
	});

	it("hides columns listed in initialColumnVisibility while others keep rendering", async () => {
		const screen = await render(
			<DataTable columns={columns} data={fruits} initialColumnVisibility={{ count: false }} />,
		);

		await expect.poll(() => rowTexts(screen)).toEqual(["banana", "apple", "cherry"]);
		await expect.element(screen.getByTestId("data-table-sort-count")).not.toBeInTheDocument();
	});

	it("renders the toolbar with a live table instance", async () => {
		const screen = await render(
			<DataTable
				columns={columns}
				data={fruits}
				toolbar={(table) => (
					<div data-testid="toolbar-probe">{table.getRowModel().rows.length} rows</div>
				)}
			/>,
		);

		await expect.element(screen.getByTestId("toolbar-probe")).toHaveTextContent("3 rows");
	});
});
