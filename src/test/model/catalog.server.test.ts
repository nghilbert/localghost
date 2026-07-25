import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The catalog module caches its result at module scope, so each test imports
// a fresh instance via `vi.resetModules()` to isolate fetch mocks.
async function freshGetCatalog() {
	vi.resetModules();
	const mod = await import("#/shared/domain/model/catalog.server");
	return mod.getCatalog;
}

const INDEX_URL =
	"https://huggingface.co/api/models?filter=gguf&sort=downloads&direction=-1&limit=200&full=true";

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

	it("composes the model id as repo:QUANT from the largest variant, preferring lfs.size", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
				return jsonResponse([
					{ id: "ggml-org/gemma-3-4b-it-GGUF", downloads: 12345, tags: ["conversational"] },
				]);
			}
			return jsonResponse([
				{ path: "gemma-3-4b-it-Q4_K_M.gguf", size: 999, lfs: { size: 2_500_000_000 } },
				{ path: "gemma-3-4b-it-Q8_0.gguf", lfs: { size: 4_500_000_000 } },
			]);
		});

		const getCatalog = await freshGetCatalog();
		const [model] = await getCatalog();
		expect(model?.id).toBe("ggml-org/gemma-3-4b-it-GGUF:Q8_0");
		expect(model?.sizeGb).toBeCloseTo(4.19, 1);
	});

	it("skips mmproj and sharded-part files", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
				return jsonResponse([{ id: "org/model-GGUF", downloads: 1, tags: [] }]);
			}
			return jsonResponse([
				{ path: "mmproj-model-f16.gguf", lfs: { size: 1_000_000 } },
				{ path: "model-00001-of-00002.gguf", lfs: { size: 1_000_000_000 } },
				{ path: "model-Q4_K_M.gguf", lfs: { size: 2_000_000_000 } },
			]);
		});

		const getCatalog = await freshGetCatalog();
		const [model] = await getCatalog();
		expect(model?.variants).toHaveLength(1);
		expect(model?.variants?.[0]?.fileName).toBe("model-Q4_K_M.gguf");
	});

	it("drops repos with zero eligible GGUF variants", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
				return jsonResponse([{ id: "org/no-gguf", downloads: 1, tags: [] }]);
			}
			return jsonResponse([{ path: "README.md", size: 100 }]);
		});

		const getCatalog = await freshGetCatalog();
		await expect(getCatalog()).resolves.toEqual([]);
	});

	it("filters out gated and private repos before fetching their trees", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);
			if (url === INDEX_URL) {
				return jsonResponse([
					{ id: "org/gated", downloads: 1, tags: [], gated: true },
					{ id: "org/private", downloads: 1, tags: [], private: true },
					{ id: "org/open", downloads: 1, tags: [] },
				]);
			}
			return jsonResponse([{ path: "model-Q4_K_M.gguf", lfs: { size: 1_000_000_000 } }]);
		});

		const getCatalog = await freshGetCatalog();
		const models = await getCatalog();
		expect(models.map((m) => m.name)).toEqual(["org/open"]);
		// Only the one eligible repo's tree should have been fetched.
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
