import { describe, expect, it } from "vitest";
import type { CatalogCandidate } from "#/shared/domain/model/catalog-curation";
import {
	baseModelKey,
	contextKFromLength,
	dedupeByBaseModel,
	deriveDisplayName,
	groupKey,
	paramBFromTotal,
	pickDefaultVariant,
} from "#/shared/domain/model/catalog-curation";
import { parseParamB } from "#/shared/domain/model/model-id";

/** A minimal `CatalogCandidate`, filling irrelevant fields with neutral defaults. */
function candidate(overrides: Partial<CatalogCandidate> & Pick<CatalogCandidate, "name">) {
	const base: CatalogCandidate = {
		name: overrides.name,
		paramB: 8,
		capabilities: [],
		updatedAt: undefined,
		author: null,
		license: null,
		likes: 0,
		createdAt: null,
		contextK: null,
		pullCount: 0,
		variants: [],
		baseModelIds: [],
		siblingRepoIds: [],
	};
	return { ...base, ...overrides };
}

describe("parseParamB", () => {
	it("parses billion-scale HF repo ids", () => {
		expect(parseParamB("Qwen3-8B")).toBe(8);
		expect(parseParamB("gemma-3-4b-it")).toBe(4);
		expect(parseParamB("Llama-3.1-405B-Instruct")).toBe(405);
	});

	it("parses million-scale tags into fractional billions", () => {
		expect(parseParamB("gemma-3-270m-it")).toBeCloseTo(0.27);
	});

	it("multiplies mixture-of-experts naming", () => {
		expect(parseParamB("Mixtral-8x7B-Instruct")).toBe(56);
	});

	it("returns null for unparseable ids", () => {
		expect(parseParamB("some-repo-without-a-size")).toBeNull();
		expect(parseParamB("")).toBeNull();
	});
});

describe("paramBFromTotal", () => {
	it("converts an exact GGUF parameter count to billions", () => {
		expect(paramBFromTotal(8_190_735_360)).toBe(8.2);
		expect(paramBFromTotal(307_581_696)).toBe(0.3);
	});

	it("rounds to a whole number at ten billion and above", () => {
		expect(paramBFromTotal(27_320_697_856)).toBe(27);
	});

	it("is null when the Hub published no count", () => {
		expect(paramBFromTotal(undefined)).toBeNull();
		expect(paramBFromTotal(0)).toBeNull();
	});
});

describe("contextKFromLength", () => {
	it("converts a token context length to K", () => {
		expect(contextKFromLength(32_768)).toBe(32);
		expect(contextKFromLength(262_144)).toBe(256);
	});

	it("is null when absent", () => {
		expect(contextKFromLength(undefined)).toBeNull();
		expect(contextKFromLength(0)).toBeNull();
	});
});

describe("groupKey", () => {
	it("prefers the Hub's base-model link over the name heuristic", () => {
		const key = groupKey({
			repoId: "bartowski/Qwen_Qwen3-8B-GGUF",
			baseModelIds: ["Qwen/Qwen3-8B"],
		});
		expect(key).toBe("qwen/qwen3-8b");
	});

	it("collides two publishers' repacks of the same base model", () => {
		expect(
			groupKey({ repoId: "bartowski/Qwen_Qwen3-8B-GGUF", baseModelIds: ["Qwen/Qwen3-8B"] }),
		).toBe(groupKey({ repoId: "unsloth/Qwen3-8B-GGUF", baseModelIds: ["Qwen/Qwen3-8B"] }));
	});

	it("falls back to the name heuristic when the repo omits the link", () => {
		expect(groupKey({ repoId: "unsloth/Qwen3-8B-GGUF", baseModelIds: [] })).toBe(
			baseModelKey("unsloth/Qwen3-8B-GGUF"),
		);
	});
});

describe("baseModelKey / deriveDisplayName", () => {
	it("strips org, GGUF suffix, and canonical instruct markers to collide repacks", () => {
		expect(baseModelKey("unsloth/Qwen3-8B-GGUF")).toBe(baseModelKey("ggml-org/Qwen3-8B-it-GGUF"));
	});

	it("does not collide a training-stage or safety-tuned variant with the base model", () => {
		const base = baseModelKey("org/Model-8B-Instruct-GGUF");
		expect(baseModelKey("org/Model-8B-Instruct-qat-GGUF")).not.toBe(base);
		expect(baseModelKey("org/Model-8B-Instruct-mtp-GGUF")).not.toBe(base);
		expect(baseModelKey("org/Model-8B-Instruct-abliterated-GGUF")).not.toBe(base);
		expect(baseModelKey("org/Model-8B-Instruct-uncensored-GGUF")).not.toBe(base);
		expect(baseModelKey("org/Model-8B-chat-GGUF")).not.toBe(base);
	});

	it("derives a clean display name", () => {
		expect(deriveDisplayName("unsloth/Qwen3.5-4B-GGUF")).toBe("Qwen3.5 4B");
		expect(deriveDisplayName("ggml-org/gemma-4-12B-it-GGUF")).toBe("Gemma 4 12B");
	});

	it("reads a base-model id without the repacker's name doubled in", () => {
		expect(deriveDisplayName("Qwen/Qwen3-8B")).toBe("Qwen3 8B");
	});
});

describe("dedupeByBaseModel", () => {
	it("collapses repacks to the best-ranked publisher and merges variants", () => {
		const merged = dedupeByBaseModel([
			candidate({
				name: "unsloth/Qwen3-8B-GGUF",
				pullCount: 100,
				variants: [{ quant: "Q4_K_M", sizeGb: 5, fileName: "a", repoId: "unsloth/Qwen3-8B-GGUF" }],
			}),
			candidate({
				name: "ggml-org/Qwen3-8B-GGUF",
				pullCount: 50,
				variants: [{ quant: "Q8_0", sizeGb: 9, fileName: "b", repoId: "ggml-org/Qwen3-8B-GGUF" }],
			}),
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0]?.name).toBe("ggml-org/Qwen3-8B-GGUF");
		expect(merged[0]?.variants.map((v) => v.quant).sort()).toEqual(["Q4_K_M", "Q8_0"]);
	});

	it("groups on the base-model link across differently named repacks", () => {
		const merged = dedupeByBaseModel([
			candidate({
				name: "bartowski/Qwen_Qwen3-8B-GGUF",
				baseModelIds: ["Qwen/Qwen3-8B"],
				variants: [
					{ quant: "Q4_K_M", sizeGb: 5, fileName: "a", repoId: "bartowski/Qwen_Qwen3-8B-GGUF" },
				],
			}),
			candidate({
				name: "unsloth/Qwen3-8B-GGUF",
				baseModelIds: ["Qwen/Qwen3-8B"],
				variants: [{ quant: "Q4_K_M", sizeGb: 5, fileName: "b", repoId: "unsloth/Qwen3-8B-GGUF" }],
			}),
		]);
		expect(merged).toHaveLength(1);
	});

	it("keeps the same quant from two publishers, so both stay selectable", () => {
		const merged = dedupeByBaseModel([
			candidate({
				name: "unsloth/Qwen3-8B-GGUF",
				baseModelIds: ["Qwen/Qwen3-8B"],
				variants: [{ quant: "Q4_K_M", sizeGb: 5, fileName: "a", repoId: "unsloth/Qwen3-8B-GGUF" }],
			}),
			candidate({
				name: "ggml-org/Qwen3-8B-GGUF",
				baseModelIds: ["Qwen/Qwen3-8B"],
				variants: [{ quant: "Q4_K_M", sizeGb: 5, fileName: "b", repoId: "ggml-org/Qwen3-8B-GGUF" }],
			}),
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0]?.variants.map((v) => v.repoId).sort()).toEqual([
			"ggml-org/Qwen3-8B-GGUF",
			"unsloth/Qwen3-8B-GGUF",
		]);
	});

	it("keeps unrelated models separate", () => {
		const merged = dedupeByBaseModel([
			candidate({
				name: "org/model-a-8B-GGUF",
				pullCount: 1,
				variants: [{ quant: "Q4_K_M", sizeGb: 5, fileName: "a", repoId: "org/model-a-8B-GGUF" }],
			}),
			candidate({
				name: "org/model-b-8B-GGUF",
				pullCount: 1,
				variants: [{ quant: "Q4_K_M", sizeGb: 5, fileName: "b", repoId: "org/model-b-8B-GGUF" }],
			}),
		]);
		expect(merged).toHaveLength(2);
	});

	it("records the group's other repos as siblings, ordered by publisher rank", () => {
		const merged = dedupeByBaseModel([
			candidate({
				name: "mradermacher/Qwen3-8B-GGUF",
				baseModelIds: ["Qwen/Qwen3-8B"],
				variants: [
					{ quant: "Q4_K_M", sizeGb: 5, fileName: "a", repoId: "mradermacher/Qwen3-8B-GGUF" },
				],
			}),
			candidate({
				name: "unsloth/Qwen3-8B-GGUF",
				baseModelIds: ["Qwen/Qwen3-8B"],
				variants: [{ quant: "Q8_0", sizeGb: 9, fileName: "b", repoId: "unsloth/Qwen3-8B-GGUF" }],
			}),
			candidate({
				name: "ggml-org/Qwen3-8B-GGUF",
				baseModelIds: ["Qwen/Qwen3-8B"],
				variants: [{ quant: "F16", sizeGb: 16, fileName: "c", repoId: "ggml-org/Qwen3-8B-GGUF" }],
			}),
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0]?.name).toBe("ggml-org/Qwen3-8B-GGUF");
		expect(merged[0]?.siblingRepoIds).toEqual([
			"unsloth/Qwen3-8B-GGUF",
			"mradermacher/Qwen3-8B-GGUF",
		]);
	});

	it("keeps a merged-in variant's own repo id, not the winning candidate's", () => {
		const merged = dedupeByBaseModel([
			candidate({
				name: "unsloth/Qwen3-8B-GGUF",
				pullCount: 100,
				variants: [{ quant: "Q4_K_M", sizeGb: 5, fileName: "a", repoId: "unsloth/Qwen3-8B-GGUF" }],
			}),
			candidate({
				name: "ggml-org/Qwen3-8B-GGUF",
				pullCount: 50,
				variants: [{ quant: "Q8_0", sizeGb: 9, fileName: "b", repoId: "ggml-org/Qwen3-8B-GGUF" }],
			}),
		]);
		expect(merged[0]?.name).toBe("ggml-org/Qwen3-8B-GGUF");
		const mergedInVariant = merged[0]?.variants.find((v) => v.quant === "Q4_K_M");
		expect(mergedInVariant?.repoId).toBe("unsloth/Qwen3-8B-GGUF");
	});
});

describe("pickDefaultVariant", () => {
	it("prefers Q4_K_M over the largest file", () => {
		const variants = [
			{ quant: "Q4_K_M", sizeGb: 2.5, fileName: "a", repoId: "org/model" },
			{ quant: "Q8_0", sizeGb: 4.5, fileName: "b", repoId: "org/model" },
			{ quant: "BF16", sizeGb: 8, fileName: "c", repoId: "org/model" },
		];
		expect(pickDefaultVariant(variants)?.quant).toBe("Q4_K_M");
	});

	it("takes the nearest quant at or below the target when the target is absent", () => {
		const variants = [
			{ quant: "IQ2_M", sizeGb: 3, fileName: "a", repoId: "org/model" },
			{ quant: "F32", sizeGb: 20, fileName: "b", repoId: "org/model" },
		];
		expect(pickDefaultVariant(variants)?.quant).toBe("IQ2_M");
	});

	it("returns null for an empty list", () => {
		expect(pickDefaultVariant([])).toBeNull();
	});

	it("recognizes unsloth's UD-prefixed dynamic quants, which the old fixed list missed", () => {
		const variants = [
			{ quant: "UD-Q4_K_XL", sizeGb: 5, fileName: "a", repoId: "unsloth/model-GGUF" },
			{ quant: "UD-Q2_K_XL", sizeGb: 3, fileName: "b", repoId: "unsloth/model-GGUF" },
		];
		// Q4_K_XL outranks the Q4_K_M target, so the nearest-at-or-below pick is Q2_K_XL.
		expect(pickDefaultVariant(variants)?.quant).toBe("UD-Q2_K_XL");
	});

	it("picks the closest quant above target when every option outranks it", () => {
		const variants = [
			{ quant: "UD-Q6_K_XL", sizeGb: 7, fileName: "a", repoId: "unsloth/model-GGUF" },
			{ quant: "UD-Q4_K_XL", sizeGb: 5, fileName: "b", repoId: "unsloth/model-GGUF" },
		];
		expect(pickDefaultVariant(variants)?.quant).toBe("UD-Q4_K_XL");
	});
});
