import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function freshCatalogModule() {
	vi.resetModules();
	return import("#/shared/domain/model/catalog.server");
}

function jsonResponse(body: unknown, headers?: Record<string, string>): Response {
	return new Response(JSON.stringify(body), { status: 200, headers });
}

/** Minimal index-entry shape the real Hub API returns; `id` here is the repo id. */
function indexEntry(
	overrides: Partial<{
		id: string;
		downloads: number;
		tags: string[];
		gated: boolean;
		private: boolean;
		gguf: { total?: number; context_length?: number; architecture?: string };
		baseModels: { models: { id: string }[] };
	}> & { id: string },
) {
	return {
		downloads: 0,
		tags: [],
		lastModified: "2026-01-01T00:00:00.000Z",
		createdAt: "2025-01-01T00:00:00.000Z",
		author: overrides.id.split("/")[0],
		likes: 0,
		...overrides,
	};
}

/**
 * Routes a mocked `fetch` by path shape and the `pipeline_tag` query param, rather
 * than an exact query string — `@huggingface/hub` owns URL construction and its
 * param order isn't our contract. Ingest makes one index pass per chat pipeline
 * tag ("text-generation", "image-text-to-text"); `textGeneration` supplies the
 * first, `imageTextToText` (default empty) the second.
 */
function mockHfFetch({
	textGeneration,
	imageTextToText = [],
	tree = [{ path: "model-Q4_K_M.gguf", size: 1_000_000_000 }],
}: {
	textGeneration: unknown[];
	imageTextToText?: unknown[];
	tree?: Array<{ path: string; size?: number; lfs?: { size: number } }>;
}): ReturnType<typeof vi.fn> {
	const fetchMock = vi.mocked(fetch);
	fetchMock.mockImplementation(async (input) => {
		const url = new URL(String(input));
		if (url.pathname === "/api/models") {
			const task = url.searchParams.get("pipeline_tag");
			return jsonResponse(task === "image-text-to-text" ? imageTextToText : textGeneration);
		}
		if (url.pathname.includes("/tree/")) {
			return jsonResponse(tree.map((f) => ({ type: "file", ...f })));
		}
		throw new Error(`unexpected fetch: ${url}`);
	});
	return fetchMock;
}

describe("getCatalog (Hugging Face)", () => {
	beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
	afterEach(() => vi.unstubAllGlobals());

	it("uses the default Q4_K_M quant, preserves its repository id, and reads gguf metadata", async () => {
		mockHfFetch({
			textGeneration: [
				indexEntry({
					id: "ggml-org/gemma-3-4b-it-GGUF",
					downloads: 12,
					tags: ["conversational"],
					gguf: { total: 4_300_000_000, context_length: 32_768 },
				}),
			],
			tree: [
				{ path: "gemma-Q4_K_M.gguf", lfs: { size: 2_500_000_000 } },
				{ path: "gemma-Q8_0.gguf", lfs: { size: 4_500_000_000 } },
			],
		});

		const { getCatalog } = await freshCatalogModule();
		const [model] = await getCatalog();
		expect(model?.id).toBe("ggml-org/gemma-3-4b-it-GGUF:Q4_K_M");
		expect(model?.variants?.[0]?.repoId).toBe("ggml-org/gemma-3-4b-it-GGUF");
		expect(model?.paramB).toBe(4.3);
		expect(model?.contextK).toBe(32);
	});

	it("skips mmproj files and sums sharded model parts", async () => {
		mockHfFetch({
			textGeneration: [
				indexEntry({ id: "org/model-8B-GGUF", downloads: 1, tags: ["conversational"] }),
			],
			tree: [
				{ path: "mmproj-model-f16.gguf", lfs: { size: 1_000_000 } },
				{ path: "model-Q4_K_M-00001-of-00002.gguf", lfs: { size: 1_000_000_000 } },
				{ path: "model-Q4_K_M-00002-of-00002.gguf", lfs: { size: 1_000_000_000 } },
			],
		});

		const { getCatalog } = await freshCatalogModule();
		const [model] = await getCatalog();
		expect(model?.variants).toHaveLength(1);
		expect(model?.variants?.[0]?.fileName).toBe("model-Q4_K_M-00001-of-00002.gguf");
		expect(model?.variants?.[0]?.sizeGb).toBeCloseTo(1.9, 1);
	});

	it("drops repositories with no eligible GGUF variant", async () => {
		mockHfFetch({
			textGeneration: [
				indexEntry({ id: "org/no-gguf-8B", downloads: 1, tags: ["conversational"] }),
			],
			tree: [{ path: "README.md", size: 100 }],
		});

		const { getCatalog } = await freshCatalogModule();
		await expect(getCatalog()).resolves.toEqual([]);
	});

	it("keeps a model whose id has no parseable size when the Hub reports one via gguf.total", async () => {
		mockHfFetch({
			textGeneration: [
				indexEntry({
					id: "org/no-size-in-name-GGUF",
					downloads: 1,
					tags: ["conversational"],
					gguf: { total: 8_000_000_000 },
				}),
			],
		});

		const { getCatalog } = await freshCatalogModule();
		const [model] = await getCatalog();
		expect(model?.paramB).toBe(8);
	});

	it("drops gated and private repositories before any tree fetch", async () => {
		const fetchMock = mockHfFetch({
			textGeneration: [
				indexEntry({ id: "org/gated-8B", downloads: 1, tags: ["conversational"], gated: true }),
				indexEntry({ id: "org/private-8B", downloads: 1, tags: ["conversational"], private: true }),
				indexEntry({ id: "org/open-8B", downloads: 1, tags: ["conversational"] }),
			],
		});

		const { getCatalog } = await freshCatalogModule();
		const models = await getCatalog();
		expect(models.map((model) => model.name)).toEqual(["org/open-8B"]);
		// Two index passes (one per chat pipeline tag) plus one tree fetch for the sole survivor.
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("dedupes repacks by base-model link and prefers the higher-ranked publisher", async () => {
		mockHfFetch({
			textGeneration: [
				indexEntry({
					id: "unsloth/Qwen3-8B-GGUF",
					downloads: 100,
					tags: ["conversational"],
					baseModels: { models: [{ id: "Qwen/Qwen3-8B" }] },
				}),
				indexEntry({
					id: "ggml-org/Qwen3-8B-GGUF",
					downloads: 50,
					tags: ["conversational"],
					baseModels: { models: [{ id: "Qwen/Qwen3-8B" }] },
				}),
			],
		});

		const { getCatalog } = await freshCatalogModule();
		const models = await getCatalog();
		expect(models).toHaveLength(1);
		expect(models[0]?.name).toBe("ggml-org/Qwen3-8B-GGUF");
		expect(models[0]?.displayName).toBe("Qwen3 8B");
	});

	it("raises when the Hub returns no models for either chat pipeline tag", async () => {
		mockHfFetch({ textGeneration: [] });

		const { getCatalog } = await freshCatalogModule();
		await expect(getCatalog()).rejects.toThrow("0 eligible models");
	});

	it("filters, paginates, searches, and lists licenses from the cached catalog", async () => {
		mockHfFetch({
			textGeneration: [
				indexEntry({
					id: "org/alpha-8B-GGUF",
					downloads: 300,
					tags: ["conversational", "license:mit"],
				}),
				indexEntry({
					id: "org/beta-8B-GGUF",
					downloads: 200,
					tags: ["conversational", "license:apache-2.0"],
				}),
			],
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
