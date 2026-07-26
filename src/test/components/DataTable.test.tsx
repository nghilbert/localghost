import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-react";
import { DataTable } from "#/shared/components/DataTable";
import { DataTableColumnHeader } from "#/shared/components/DataTable/DataTableColumnHeader";
import { render } from "#/test/utils";

type Fruit = { name: string; count: number };

const banana: Fruit = { name: "banana", count: 5 };
const apple: Fruit = { name: "apple", count: 2 };
const cherry: Fruit = { name: "cherry", count: 9 };
const fruits: Fruit[] = [banana, apple, cherry];

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

	it("fuzzy-filters rows as the toolbar search box is typed into", async () => {
		const screen = await render(
			<DataTable columns={columns} data={fruits} searchPlaceholder="Search fruit…" />,
		);

		await screen.getByTestId("data-table-search").fill("cher");

		await expect.poll(() => rowTexts(screen)).toEqual(["cherry"]);
	});

	it("renders no toolbar when neither a search box nor filters are requested", async () => {
		const screen = await render(<DataTable columns={columns} data={fruits} />);

		await expect.element(screen.getByTestId("data-table-search")).not.toBeInTheDocument();
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

	it("renders caller-supplied filters in the toolbar, passing the table instance", async () => {
		const screen = await render(
			<DataTable
				columns={columns}
				data={fruits}
				filters={(table) => (
					<div data-testid="filters-probe">{table.getRowModel().rows.length} rows</div>
				)}
			/>,
		);

		await expect.element(screen.getByTestId("filters-probe")).toHaveTextContent("3 rows");
	});

	describe("row expansion", () => {
		it("renders no detail rows or expand toggles when renderDetail is omitted", async () => {
			const screen = await render(<DataTable columns={columns} data={fruits} />);

			await expect.element(screen.getByTestId("data-table-row").first()).toBeInTheDocument();
			await expect
				.element(screen.getByTestId("data-table-expand-toggle").first())
				.not.toBeInTheDocument();
		});

		it("expands a row's detail panel on toggle click and collapses on a second click", async () => {
			const screen = await render(
				<DataTable
					columns={columns}
					data={fruits}
					renderDetail={(row) => <div data-testid="detail-content">{row.name} details</div>}
				/>,
			);

			await expect.element(screen.getByTestId("data-table-detail-row")).not.toBeInTheDocument();

			await screen.getByTestId("data-table-expand-toggle").first().click();

			await expect.element(screen.getByTestId("data-table-detail-row")).toBeInTheDocument();
			await expect
				.element(screen.getByTestId("detail-content"))
				.toHaveTextContent("banana details");

			await screen.getByTestId("data-table-expand-toggle").first().click();

			await expect.element(screen.getByTestId("data-table-detail-row")).not.toBeInTheDocument();
		});

		it("expands a row when the row itself is clicked, not just the toggle", async () => {
			const screen = await render(
				<DataTable
					columns={columns}
					data={fruits}
					renderDetail={(row) => <div data-testid="detail-content">{row.name} details</div>}
				/>,
			);

			await screen.getByTestId("data-table-row").first().click();

			await expect.element(screen.getByTestId("data-table-detail-row")).toBeInTheDocument();
		});

		it("closes the previously expanded row when another row is expanded", async () => {
			const screen = await render(
				<DataTable
					columns={columns}
					data={fruits}
					renderDetail={(row) => <div data-testid="detail-content">{row.name} details</div>}
				/>,
			);

			await screen.getByTestId("data-table-row").first().click();
			await expect
				.element(screen.getByTestId("detail-content"))
				.toHaveTextContent("banana details");

			await screen.getByTestId("data-table-row").nth(1).click();

			await expect.poll(() => screen.getByTestId("data-table-detail-row").all().length).toBe(1);
			await expect.element(screen.getByTestId("detail-content")).toHaveTextContent("apple details");
		});

		it("keeps expanded content attached to a stable row id as data changes", async () => {
			const renderTable = ({ data }: { data: Fruit[] }) => (
				<DataTable
					columns={columns}
					data={data}
					searchPlaceholder="Search fruit…"
					getRowId={(row) => row.name}
					renderDetail={(row) => <div data-testid="detail-content">{row.name} details</div>}
				/>
			);
			const screen = await render(renderTable({ data: fruits }));

			await screen.getByTestId("data-table-row").first().click();
			await expect
				.element(screen.getByTestId("detail-content"))
				.toHaveTextContent("banana details");

			await screen.rerender(renderTable({ data: [apple, cherry, banana] }));
			await expect
				.element(screen.getByTestId("detail-content"))
				.toHaveTextContent("banana details");

			await screen.getByTestId("data-table-search").fill("apple");
			await expect.element(screen.getByTestId("data-table-detail-row")).not.toBeInTheDocument();

			await screen.getByTestId("data-table-search").fill("");
			await expect
				.element(screen.getByTestId("detail-content"))
				.toHaveTextContent("banana details");
		});
	});

	describe("manual/server mode", () => {
		it("advances the caller's page state without a client row model, leaving data order alone", async () => {
			function Harness() {
				const [pagination, setPagination] = useState<PaginationState>({
					pageIndex: 0,
					pageSize: 2,
				});
				const page = pagination.pageIndex === 0 ? [banana, apple] : [cherry];
				return (
					<DataTable
						columns={columns}
						data={page}
						manualPagination
						pagination={pagination}
						onPaginationChange={setPagination}
						rowCount={fruits.length}
					/>
				);
			}
			const screen = await render(<Harness />);

			await expect.poll(() => rowTexts(screen)).toEqual(["banana", "apple"]);

			await screen.getByTestId("data-table-next-page").first().click();

			await expect.poll(() => rowTexts(screen)).toEqual(["cherry"]);
		});

		it("fires onSortingChange without reordering data itself", async () => {
			function Harness() {
				const [sorting, setSorting] = useState<SortingState>([]);
				return (
					<DataTable
						columns={columns}
						data={fruits}
						sorting={sorting}
						onSortingChange={setSorting}
					/>
				);
			}
			const screen = await render(<Harness />);

			await screen.getByTestId("data-table-sort-count").click();

			// Manual sorting: the caller's data order is left exactly as given.
			await expect.poll(() => rowTexts(screen)).toEqual(["banana", "apple", "cherry"]);
		});

		it("reflects a controlled search value without filtering data locally", async () => {
			function Harness() {
				const [searchValue, setSearchValue] = useState("");
				return (
					<DataTable
						columns={columns}
						data={fruits}
						searchPlaceholder="Search fruit…"
						searchValue={searchValue}
						onSearchChange={setSearchValue}
					/>
				);
			}
			const screen = await render(<Harness />);

			await screen.getByTestId("data-table-search").fill("cher");

			await expect.element(screen.getByTestId("data-table-search")).toHaveValue("cher");
			// Manual filtering: the caller's data is left exactly as given, unfiltered.
			await expect.poll(() => rowTexts(screen)).toEqual(["banana", "apple", "cherry"]);
		});

		it("renders skeleton rows instead of data while isLoading", async () => {
			const screen = await render(<DataTable columns={columns} data={fruits} isLoading />);

			await expect.element(screen.getByTestId("data-table-row")).not.toBeInTheDocument();
			await expect
				.element(screen.getByTestId("data-table-skeleton-row").first())
				.toBeInTheDocument();
		});
	});
});
