import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const INDEX_URL =
	"https://huggingface.co/api/models?filter=gguf&sort=downloads&direction=-1&limit=100&expand[]=author&expand[]=downloads&expand[]=likes&expand[]=tags&expand[]=lastModified&expand[]=createdAt&expand[]=gated&expand[]=private&expand[]=pipeline_tag";

async function freshCatalogModule() {
	vi.resetModules();
	return import("#/shared/domain/model/catalog.server");
}

function jsonResponse(body: unknown, headers?: Record<string, string>): Response {
	return new Response(JSON.stringify(body), { status: 200, headers });
}

describe("getCatalog (Hugging Face)", () => {
	beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
	afterEach(() => vi.unstubAllGlobals());

	it("uses the default Q4_K_M quant and preserves its repository id", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			if (String(input) === INDEX_URL) {
				return jsonResponse([
					{ id: "ggml-org/gemma-3-4b-it-GGUF", downloads: 12, tags: ["conversational"] },
				]);
			}
			return jsonResponse([
				{ path: "gemma-Q4_K_M.gguf", lfs: { size: 2_500_000_000 } },
				{ path: "gemma-Q8_0.gguf", lfs: { size: 4_500_000_000 } },
			]);
		});

		const { getCatalog } = await freshCatalogModule();
		const [model] = await getCatalog();
		expect(model?.id).toBe("ggml-org/gemma-3-4b-it-GGUF:Q4_K_M");
		expect(model?.variants?.[0]?.repoId).toBe("ggml-org/gemma-3-4b-it-GGUF");
	});

	it("skips mmproj files and sums sharded model parts", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			if (String(input) === INDEX_URL) {
				return jsonResponse([{ id: "org/model-8B-GGUF", downloads: 1, tags: ["conversational"] }]);
			}
			return jsonResponse([
				{ path: "mmproj-model-f16.gguf", lfs: { size: 1_000_000 } },
				{ path: "model-Q4_K_M-00001-of-00002.gguf", lfs: { size: 1_000_000_000 } },
				{ path: "model-Q4_K_M-00002-of-00002.gguf", lfs: { size: 1_000_000_000 } },
			]);
		});

		const { getCatalog } = await freshCatalogModule();
		const [model] = await getCatalog();
		expect(model?.variants).toHaveLength(1);
		expect(model?.variants?.[0]?.fileName).toBe("model-Q4_K_M-00001-of-00002.gguf");
		expect(model?.variants?.[0]?.sizeGb).toBeCloseTo(1.9, 1);
	});

	it("drops repositories without an eligible GGUF variant or parseable size", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			if (String(input) === INDEX_URL) {
				return jsonResponse([{ id: "org/no-gguf-8B", downloads: 1, tags: ["conversational"] }]);
			}
			return jsonResponse([{ path: "README.md", size: 100 }]);
		});

		const { getCatalog } = await freshCatalogModule();
		await expect(getCatalog()).resolves.toEqual([]);
	});

	it("filters gated, private, and non-chat repositories before tree fetches", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			if (String(input) === INDEX_URL) {
				return jsonResponse([
					{ id: "org/gated-8B", downloads: 1, tags: ["conversational"], gated: true },
					{ id: "org/private-8B", downloads: 1, tags: ["conversational"], private: true },
					{
						id: "org/embedder-8B",
						downloads: 1,
						tags: [],
						pipeline_tag: "feature-extraction",
					},
					{ id: "org/open-8B", downloads: 1, tags: ["conversational"] },
				]);
			}
			return jsonResponse([{ path: "model-Q4_K_M.gguf", lfs: { size: 1_000_000_000 } }]);
		});

		const { getCatalog } = await freshCatalogModule();
		const models = await getCatalog();
		expect(models.map((model) => model.name)).toEqual(["org/open-8B"]);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("dedupes repacks and prefers the higher-ranked publisher", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			if (String(input) === INDEX_URL) {
				return jsonResponse([
					{ id: "unsloth/Qwen3-8B-GGUF", downloads: 100, tags: ["conversational"] },
					{ id: "ggml-org/Qwen3-8B-GGUF", downloads: 50, tags: ["conversational"] },
				]);
			}
			return jsonResponse([{ path: "model-Q4_K_M.gguf", lfs: { size: 1_000_000_000 } }]);
		});

		const { getCatalog } = await freshCatalogModule();
		const models = await getCatalog();
		expect(models).toHaveLength(1);
		expect(models[0]?.name).toBe("ggml-org/Qwen3-8B-GGUF");
	});

	it("stops after 200 eligible entries and scans no more than 400 raw entries", async () => {
		const eligiblePage = Array.from({ length: 100 }, (_, index) => ({
			id: `org/model-${index}-8B-GGUF`,
			downloads: index,
			tags: ["conversational"],
		}));
		const secondPage = Array.from({ length: 100 }, (_, index) => ({
			id: `org/model-${index + 100}-8B-GGUF`,
			downloads: index + 100,
			tags: ["conversational"],
		}));
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
				return jsonResponse(eligiblePage, {
					link: '<https://huggingface.co/api/models?cursor=second>; rel="next"',
				});
			}
			if (url.includes("cursor=second")) {
				return jsonResponse(secondPage, {
					link: '<https://huggingface.co/api/models?cursor=third>; rel="next"',
				});
			}
			if (url.includes("cursor=third")) throw new Error("should not fetch a third index page");
			return jsonResponse([{ path: "model-Q4_K_M.gguf", lfs: { size: 1_000_000_000 } }]);
		});

		const { getCatalog } = await freshCatalogModule();
		await expect(getCatalog()).resolves.toHaveLength(200);
	});

	it("does not scan more than 400 raw index entries", async () => {
		const page = Array.from({ length: 100 }, (_, index) => ({
			id: `org/embedder-${index}-8B`,
			pipeline_tag: "feature-extraction",
		}));
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url.includes("/models?")) {
				const cursor = new URL(url).searchParams.get("cursor");
				const next = cursor ? Number(cursor) + 1 : 1;
				return jsonResponse(page, {
					link: `<https://huggingface.co/api/models?cursor=${next}>; rel="next"`,
				});
			}
			throw new Error("ineligible entries should not fetch repository trees");
		});

		const { getCatalog } = await freshCatalogModule();
		await expect(getCatalog()).rejects.toThrow("0 eligible models");
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});

	it("filters, paginates, searches, and filters licenses from the cached catalog", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			if (String(input) === INDEX_URL) {
				return jsonResponse([
					{ id: "org/alpha-8B-GGUF", downloads: 300, tags: ["conversational", "license:mit"] },
					{
						id: "org/beta-8B-GGUF",
						downloads: 200,
						tags: ["conversational", "license:apache-2.0"],
					},
				]);
			}
			return jsonResponse([{ path: "model-Q4_K_M.gguf", lfs: { size: 1_000_000_000 } }]);
		});

		const { getCatalogPage } = await freshCatalogModule();
		const page = await getCatalogPage({
			page: 0,
			pageSize: 1,
			sortBy: "pullCount",
			sortDir: "desc",
			license: "mit",
			search: "alpha",
		});
		expect(page.rows.map((model) => model.name)).toEqual(["org/alpha-8B-GGUF"]);
		expect(page.total).toBe(1);
		expect(page.availableLicenses).toEqual(["apache-2.0", "mit"]);
	});
});
