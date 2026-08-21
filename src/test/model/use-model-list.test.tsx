import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_PAGE_SIZE } from "#/routes/_authenticated/library/-hooks/use-model-list";
import type {
	CatalogModel,
	HardwareInfo,
	InstalledModel,
	PullProgress,
} from "#/shared/domain/model/types";
import { makeCatalogModel, makeHardware, makeInstalledModel } from "#/test/factories";
import { renderHook } from "#/test/utils";

type CatalogInput = { page: number; search?: string; licenses?: string[] };
type CatalogPage = {
	rows: CatalogModel[];
	total: number;
	availableLicenses: string[];
};

const { fetchCatalogPage, fetchCatalogByIds } = vi.hoisted(() => ({
	fetchCatalogPage: vi.fn(),
	fetchCatalogByIds: vi.fn(),
}));

vi.mock("#/shared/domain/model/model.functions", () => ({
	catalogQueryOptions: (input: CatalogInput) => ({
		queryKey: ["catalog", input],
		queryFn: () => fetchCatalogPage(input),
	}),
	catalogByIdsQueryOptions: (ids: string[]) => ({
		queryKey: ["catalog-by-ids", ids],
		queryFn: () => fetchCatalogByIds(ids),
	}),
	modelVariantsQueryOptions: (input: { repoId: string }) => ({
		queryKey: ["model-variants", input],
		queryFn: () => [],
	}),
}));

const { useModelList } = await import("#/routes/_authenticated/library/-hooks/use-model-list");

function catalogPage(overrides: Partial<CatalogPage> = {}): CatalogPage {
	return { rows: [], total: 0, availableLicenses: ["mit", "apache-2.0"], ...overrides };
}

function mountList({
	installedModels = [],
	pulling = {},
	hardware,
}: {
	installedModels?: InstalledModel[];
	pulling?: Record<string, PullProgress>;
	hardware?: HardwareInfo;
} = {}) {
	return renderHook(() => useModelList({ installedModels, pulling, hardware }));
}

type ListResult = { current: ReturnType<typeof useModelList> };

async function selectLicense(result: ListResult, license: string) {
	const control = (list: ListResult) =>
		list.current.facets
			.find((facet) => facet.id === "license")
			?.controls.find((option) => option.value === license);
	// The option only exists once the catalog page's licenses have loaded.
	await expect.poll(() => control(result)).toBeDefined();
	control(result)?.onToggle(true);
}

function clearFacet(result: ListResult, facetId: string) {
	result.current.facets.find((facet) => facet.id === facetId)?.clear();
}

beforeEach(() => {
	vi.clearAllMocks();
	fetchCatalogPage.mockResolvedValue(catalogPage());
	fetchCatalogByIds.mockResolvedValue([]);
});

describe("useModelList counts", () => {
	it("only counts installed models that survive the active facets against the server total", async () => {
		const mitModel = makeCatalogModel({ id: "org/mit-model:Q4_K_M", license: "mit" });
		const apacheModel = makeCatalogModel({ id: "org/apache-model:Q4_K_M", license: "apache-2.0" });
		fetchCatalogByIds.mockResolvedValue([mitModel, apacheModel]);
		fetchCatalogPage.mockResolvedValue(catalogPage({ total: 10 }));

		const { result } = await mountList({
			installedModels: [
				makeInstalledModel({ id: mitModel.id }),
				makeInstalledModel({ id: apacheModel.id }),
			],
		});

		await expect.poll(() => result.current.counts.all).toBe(10);
		// No facets yet: both installed models count against the total.
		expect(result.current.counts.available).toBe(8);

		await selectLicense(result, "mit");

		// Only the MIT model still matches, so exactly one comes off the total.
		await expect.poll(() => result.current.counts.available).toBe(9);
		expect(result.current.counts.installed).toBe(2);
	});

	it("never reports a negative available count when installs outnumber the filtered total", async () => {
		const model = makeCatalogModel({ id: "org/only:Q4_K_M", license: "mit" });
		fetchCatalogByIds.mockResolvedValue([model]);
		fetchCatalogPage.mockResolvedValue(catalogPage({ total: 0 }));

		const { result } = await mountList({ installedModels: [makeInstalledModel({ id: model.id })] });

		await expect.poll(() => result.current.counts.installed).toBe(1);
		expect(result.current.counts.available).toBe(0);
	});
});

describe("useModelList rows", () => {
	it("merges installed and in-flight models onto the catalog page", async () => {
		const onPage = makeCatalogModel({ id: "org/on-page:Q4_K_M" });
		const offPage = makeCatalogModel({ id: "org/installed-elsewhere:Q4_K_M" });
		fetchCatalogPage.mockResolvedValue(catalogPage({ rows: [onPage], total: 1 }));
		fetchCatalogByIds.mockResolvedValue([offPage]);

		const { result } = await mountList({
			installedModels: [makeInstalledModel({ id: offPage.id })],
			pulling: { "org/downloading:Q4_K_M": { status: "Downloading", completed: 1, total: 2 } },
		});

		await expect.poll(() => result.current.rows.length).toBe(3);
		const byId = new Map(result.current.rows.map((row) => [row.id, row]));
		// The off-page installed row is enriched from the by-ids lookup, not left bare.
		expect(byId.get(offPage.id)?.catalog?.id).toBe(offPage.id);
		expect(byId.get(offPage.id)?.installed).not.toBeNull();
		expect(byId.get("org/downloading:Q4_K_M")?.pullState?.completed).toBe(1);
		expect(byId.get(onPage.id)?.installed).toBeNull();
	});

	it("drops installed rows on the Available tab", async () => {
		const installed = makeCatalogModel({ id: "org/installed:Q4_K_M" });
		const available = makeCatalogModel({ id: "org/available:Q4_K_M" });
		fetchCatalogPage.mockResolvedValue(catalogPage({ rows: [installed, available], total: 2 }));
		fetchCatalogByIds.mockResolvedValue([installed]);

		const { result } = await mountList({
			installedModels: [makeInstalledModel({ id: installed.id })],
		});
		await expect.poll(() => result.current.rows.length).toBe(2);

		result.current.handleStatusChange("available");

		await expect.poll(() => result.current.rows.map((row) => row.id)).toEqual([available.id]);
	});

	it("hides installed models that can't fit the host on the Installed tab", async () => {
		const fits = makeCatalogModel({ id: "org/fits:Q4_K_M", sizeGb: 2 });
		const tooBig = makeCatalogModel({ id: "org/too-big:Q4_K_M", sizeGb: 40 });
		fetchCatalogByIds.mockResolvedValue([fits, tooBig]);

		const { result } = await mountList({
			installedModels: [makeInstalledModel({ id: fits.id }), makeInstalledModel({ id: tooBig.id })],
			hardware: makeHardware({ totalRamGb: 8, freeRamGb: 8, gpus: null }),
		});

		result.current.handleStatusChange("installed");
		await expect.poll(() => result.current.rows.map((row) => row.id)).toEqual([fits.id]);

		clearFacet(result, "hardware");
		await expect
			.poll(() => result.current.rows.map((row) => row.id).sort())
			.toEqual([fits.id, tooBig.id]);
	});

	it("serves the Installed tab without asking the server for a catalog page", async () => {
		const model = makeCatalogModel({ id: "org/installed:Q4_K_M" });
		fetchCatalogByIds.mockResolvedValue([model]);

		const { result } = await mountList({ installedModels: [makeInstalledModel({ id: model.id })] });
		await expect.poll(() => fetchCatalogPage.mock.calls.length).toBe(1);

		result.current.handleStatusChange("installed");

		await expect.poll(() => result.current.rows.map((row) => row.id)).toEqual([model.id]);
		// `enabled: !isInstalledOnly` means no second page fetch for this tab.
		expect(fetchCatalogPage).toHaveBeenCalledTimes(1);
	});
});

describe("useModelList query input", () => {
	it("debounces typing into a single search request", async () => {
		const { result } = await mountList();
		await expect.poll(() => fetchCatalogPage.mock.calls.length).toBe(1);

		result.current.handleSearchChange("lla");
		result.current.handleSearchChange("llam");
		result.current.handleSearchChange("llama");

		await expect.poll(() => fetchCatalogPage.mock.calls.length).toBe(2);
		expect(fetchCatalogPage).toHaveBeenLastCalledWith(expect.objectContaining({ search: "llama" }));
	});

	it("forwards the selected facets to the server rather than filtering only locally", async () => {
		const { result } = await mountList();
		await expect.poll(() => fetchCatalogPage.mock.calls.length).toBe(1);

		await selectLicense(result, "mit");

		await expect
			.poll(() => fetchCatalogPage.mock.lastCall?.[0])
			.toEqual(expect.objectContaining({ licenses: ["mit"] }));
	});

	it("returns to the first page whenever a filter changes", async () => {
		fetchCatalogPage.mockResolvedValue(catalogPage({ total: CATALOG_PAGE_SIZE * 3 }));
		const { result } = await mountList();
		await expect.poll(() => result.current.pageCount).toBe(3);

		result.current.setPage(2);
		await expect.poll(() => result.current.page).toBe(2);

		result.current.handleSearchChange("qwen");

		await expect.poll(() => result.current.page).toBe(0);
		expect(fetchCatalogPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }));
	});
});
