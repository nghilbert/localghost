import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The catalog module caches its result at module scope, so each test imports
// a fresh instance via `vi.resetModules()` to isolate fetch mocks.
async function freshGetCatalog() {
	vi.resetModules();
	const mod = await import("#/shared/domain/model/catalog.server");
	return mod.getCatalog;
}

const INDEX_URL =
	"https://huggingface.co/api/models?filter=gguf&sort=downloads&direction=-1&limit=100&expand[]=downloads&expand[]=tags&expand[]=lastModified&expand[]=gated&expand[]=private&expand[]=pipeline_tag";

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), { status: 200 });
}

describe("getCatalog (Hugging Face)", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("picks Q4_K_M as the default quant when available, not the largest file", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
				return jsonResponse([
					{
						id: "ggml-org/gemma-3-4b-it-GGUF",
						downloads: 12345,
						tags: ["conversational"],
						pipeline_tag: "text-generation",
					},
				]);
			}
			return jsonResponse([
				{ path: "gemma-3-4b-it-Q4_K_M.gguf", size: 999, lfs: { size: 2_500_000_000 } },
				{ path: "gemma-3-4b-it-Q8_0.gguf", lfs: { size: 4_500_000_000 } },
			]);
		});

		const getCatalog = await freshGetCatalog();
		const [model] = await getCatalog();
		expect(model?.id).toBe("ggml-org/gemma-3-4b-it-GGUF:Q4_K_M");
		expect(model?.sizeGb).toBeCloseTo(2.3, 1);
		expect(model?.displayName).toBe("Gemma 3 4B");
	});

	it("skips mmproj files, and sums a sharded model's parts into one variant", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
				return jsonResponse([{ id: "org/model-8B-GGUF", downloads: 1, tags: ["conversational"] }]);
			}
			return jsonResponse([
				{ path: "mmproj-model-f16.gguf", lfs: { size: 1_000_000 } },
				{ path: "model-Q4_K_M-00001-of-00002.gguf", lfs: { size: 1_000_000_000 } },
				{ path: "model-Q4_K_M-00002-of-00002.gguf", lfs: { size: 1_000_000_000 } },
			]);
		});

		const getCatalog = await freshGetCatalog();
		const [model] = await getCatalog();
		expect(model?.variants).toHaveLength(1);
		expect(model?.variants?.[0]?.fileName).toBe("model-Q4_K_M-00001-of-00002.gguf");
		expect(model?.variants?.[0]?.sizeGb).toBeCloseTo(1.9, 1);
	});

	it("drops repos with zero eligible GGUF variants or no parseable size", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
				return jsonResponse([{ id: "org/no-gguf-8B", downloads: 1, tags: ["conversational"] }]);
			}
			return jsonResponse([{ path: "README.md", size: 100 }]);
		});

		const getCatalog = await freshGetCatalog();
		await expect(getCatalog()).resolves.toEqual([]);
	});

	it("filters out gated, private, and non-chat repos before fetching their trees", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
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

		const getCatalog = await freshGetCatalog();
		const models = await getCatalog();
		expect(models.map((m) => m.name)).toEqual(["org/open-8B"]);
		// Only the one eligible repo's tree should have been fetched.
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("dedupes repacks of the same base model, preferring the higher-ranked publisher", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
				return jsonResponse([
					{ id: "unsloth/Qwen3-8B-GGUF", downloads: 100, tags: ["conversational"] },
					{ id: "ggml-org/Qwen3-8B-GGUF", downloads: 50, tags: ["conversational"] },
				]);
			}
			return jsonResponse([{ path: "model-Q4_K_M.gguf", lfs: { size: 1_000_000_000 } }]);
		});

		const getCatalog = await freshGetCatalog();
		const models = await getCatalog();
		expect(models).toHaveLength(1);
		expect(models[0]?.name).toBe("ggml-org/Qwen3-8B-GGUF");
	});

	it("stops indexing after 200 eligible models without reading later pages", async () => {
		const firstPage = Array.from({ length: 100 }, (_, index) => ({
			id: `org/model-${index}-8B-GGUF`,
			downloads: index,
			tags: ["conversational"],
		}));
		const secondPage = Array.from({ length: 100 }, (_, index) => ({
			id: `org/model-${index + 100}-8B-GGUF`,
			downloads: index,
			tags: ["conversational"],
		}));
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
				return new Response(JSON.stringify(firstPage), {
					status: 200,
					headers: { link: '<https://huggingface.co/api/models?cursor=second>; rel="next"' },
				});
			}
			if (url === "https://huggingface.co/api/models?cursor=second") {
				return new Response(JSON.stringify(secondPage), {
					status: 200,
					headers: { link: '<https://huggingface.co/api/models?cursor=third>; rel="next"' },
				});
			}
			if (url === "https://huggingface.co/api/models?cursor=third") {
				throw new Error("catalog should stop after 200 eligible models");
			}
			return jsonResponse([{ path: "model-Q4_K_M.gguf", lfs: { size: 1_000_000_000 } }]);
		});

		const getCatalog = await freshGetCatalog();
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
				return new Response(JSON.stringify(page), {
					status: 200,
					headers: { link: `<https://huggingface.co/api/models?cursor=${next}>; rel="next"` },
				});
			}
			throw new Error("ineligible entries should not fetch repository trees");
		});

		const getCatalog = await freshGetCatalog();
		await expect(getCatalog()).rejects.toThrow("0 eligible models");
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});
});
