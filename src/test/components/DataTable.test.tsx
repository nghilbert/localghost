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
	const rows = screen.getAllByRole("row").slice(1); // skip header row
	return rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent);
}

describe("DataTable", () => {
	it("renders one row per data item", () => {
		render(<DataTable columns={columns} data={fruits} />);
		expect(getRowTexts()).toEqual(["banana", "apple", "cherry"]);
	});

	it("shows the empty message when there is no data", () => {
		render(<DataTable columns={columns} data={[]} emptyMessage="Nothing here." />);
		expect(screen.getByText("Nothing here.")).toBeInTheDocument();
	});

	it("applies initial sorting", () => {
		render(
			<DataTable columns={columns} data={fruits} initialSorting={[{ id: "count", desc: true }]} />,
		);
		expect(getRowTexts()).toEqual(["cherry", "banana", "apple"]);
	});

	it("sorts when a sortable column header is clicked", async () => {
		render(<DataTable columns={columns} data={fruits} />);
		await userEvent.click(screen.getByRole("button", { name: "Count" }));
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
		const rows = screen.getAllByRole("row").slice(1);
		const appleRow = rows.find((row) => row.textContent?.includes("apple"));
		expect(appleRow).toHaveClass("test-highlight");
	});
});
