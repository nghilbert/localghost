import type { ColumnDef } from "@tanstack/react-table";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DataTable } from "#/components/DataTable";
import { DataTableColumnHeader } from "#/components/DataTable/DataTableColumnHeader";
import { render, screen, within } from "#/test/utils";

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

function getRowTexts() {
	return screen
		.getAllByTestId("data-table-row")
		.map((row) => within(row).getAllByTestId("data-table-cell")[0]?.textContent);
}

describe("DataTable", () => {
	it("renders one row per data item", () => {
		render(<DataTable columns={columns} data={fruits} />);
		expect(getRowTexts()).toEqual(["banana", "apple", "cherry"]);
	});

	it("shows the empty message when there is no data", () => {
		render(<DataTable columns={columns} data={[]} emptyMessage="Nothing here." />);
		expect(screen.getByTestId("data-table-empty")).toHaveTextContent("Nothing here.");
	});

	it("applies initial sorting", () => {
		render(
			<DataTable columns={columns} data={fruits} initialSorting={[{ id: "count", desc: true }]} />,
		);
		expect(getRowTexts()).toEqual(["cherry", "banana", "apple"]);
	});

	it("sorts when a sortable column header is clicked", async () => {
		render(<DataTable columns={columns} data={fruits} />);
		await userEvent.click(screen.getByTestId("data-table-sort-count"));
		expect(getRowTexts()).toEqual(["apple", "banana", "cherry"]);
	});

	it("filters rows via the controlled global filter", () => {
		render(<DataTable columns={columns} data={fruits} globalFilter="cher" />);
		expect(getRowTexts()).toEqual(["cherry"]);
	});

	it("applies getRowClassName to data rows", () => {
		render(
			<DataTable
				columns={columns}
				data={fruits}
				getRowClassName={(row) => (row.name === "apple" ? "test-highlight" : undefined)}
			/>,
		);
		const rows = screen.getAllByTestId("data-table-row");
		const appleRow = rows.find((row) => row.textContent?.includes("apple"));
		expect(appleRow).toHaveClass("test-highlight");
	});

	it("paginates rows and advances page via the next-page control", async () => {
		const user = userEvent.setup();
		render(<DataTable columns={columns} data={fruits} pageSize={2} />);

		expect(getRowTexts()).toEqual(["banana", "apple"]);

		// Pagination renders above and below the table, so two identical controls exist.
		const [nextButton] = screen.getAllByTestId("data-table-next-page");
		if (!nextButton) throw new Error("expected a next-page control");
		await user.click(nextButton);
		expect(getRowTexts()).toEqual(["cherry"]);
	});

	it("hides columns listed in initialColumnVisibility", () => {
		render(
			<DataTable columns={columns} data={fruits} initialColumnVisibility={{ count: false }} />,
		);
		expect(screen.queryByTestId("data-table-sort-count")).not.toBeInTheDocument();
		expect(screen.getByText("Name")).toBeInTheDocument();
	});

	it("renders the toolbar above the table with a live table instance", () => {
		render(
			<DataTable
				columns={columns}
				data={fruits}
				toolbar={(table) => <div>{table.getRowModel().rows.length} rows</div>}
			/>,
		);
		expect(screen.getByText("3 rows")).toBeInTheDocument();
	});
});
