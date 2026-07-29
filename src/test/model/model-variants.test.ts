import { describe, expect, it } from "vitest";
import {
	buildModelVariants,
	formatModelVariantDetails,
} from "#/routes/_authenticated/library/-lib/model-variants";
import type { ModelVariantInfo } from "#/shared/domain/model/types";
import { makeCatalogModel, makeHardware } from "#/test/factories";

function variant({
	quant,
	sizeGb = null,
	repoId = "org/model-GGUF",
}: {
	quant: string;
	sizeGb?: number | null;
	repoId?: string;
}): ModelVariantInfo {
	return { quant, sizeGb, fileName: `model-${quant}.gguf`, repoId };
}

describe("buildModelVariants", () => {
	it("selects the catalog id's exact quant as current", () => {
		const catalog = makeCatalogModel({
			id: "org/llama3.1-GGUF:Q4_K_M",
			name: "org/llama3.1-GGUF",
			variants: [
				variant({ quant: "Q8_0", sizeGb: 8.5, repoId: "org/llama3.1-GGUF" }),
				variant({ quant: "Q4_K_M", sizeGb: 4.9, repoId: "org/llama3.1-GGUF" }),
			],
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		expect(variants.initialModelId).toBe("org/llama3.1-GGUF:Q4_K_M");
		expect(variants.options.map((option) => option.quant)).toEqual(["Q4_K_M", "Q8_0"]);
	});

	it("does not mark a merged-in publisher's same-named quant as current", () => {
		const catalog = makeCatalogModel({
			id: "ggml-org/llama3.1-GGUF:Q4_K_M",
			name: "ggml-org/llama3.1-GGUF",
			variants: [
				variant({ quant: "Q4_K_M", sizeGb: 4.9, repoId: "ggml-org/llama3.1-GGUF" }),
				variant({ quant: "Q4_K_M", sizeGb: 4.8, repoId: "unsloth/llama3.1-GGUF" }),
			],
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		const current = variants.options.filter((option) => option.isCurrent);
		expect(current).toHaveLength(1);
		expect(current[0]?.repoId).toBe("ggml-org/llama3.1-GGUF");
		expect(variants.initialModelId).toBe("ggml-org/llama3.1-GGUF:Q4_K_M");
	});

	it("lists every quant found in the repo, ordered current-first then by size", () => {
		const catalog = makeCatalogModel({
			id: "org/model-GGUF:Q4_K_M",
			name: "org/model-GGUF",
			variants: [
				variant({ quant: "F16", sizeGb: 16 }),
				variant({ quant: "Q8_0", sizeGb: 8 }),
				variant({ quant: "Q4_K_M", sizeGb: 4 }),
			],
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		expect(variants.options.map((option) => option.quant)).toEqual(["Q4_K_M", "Q8_0", "F16"]);
	});

	it("synthesizes a single option from the catalog row when no variants were fetched", () => {
		const catalog = makeCatalogModel({
			id: "org/llama3.1-GGUF:Q4_K_M",
			name: "org/llama3.1-GGUF",
			paramB: 8,
			sizeGb: 4.9,
			contextK: 128,
			variants: undefined,
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		expect(variants.options).toEqual([
			{
				quant: "Q4_K_M",
				modelId: "org/llama3.1-GGUF:Q4_K_M",
				sizeGb: 4.9,
				contextK: 128,
				estimatedMemoryGb: 6.6,
				fit: null,
				isCurrent: true,
				repoId: "org/llama3.1-GGUF",
				isSameRepoAsPrimary: true,
			},
		]);
	});

	it("orders the current quant first, then by size, then alphabetically", () => {
		const catalog = makeCatalogModel({
			id: "org/model-GGUF:Q4_K_M",
			name: "org/model-GGUF",
			variants: [
				variant({ quant: "IQ4_XS", sizeGb: null }),
				variant({ quant: "Q8_0", sizeGb: 8 }),
				variant({ quant: "Q3_K_S", sizeGb: 3 }),
				variant({ quant: "Q4_K_M", sizeGb: 4 }),
				variant({ quant: "Q4_0", sizeGb: 8 }),
			],
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		expect(variants.options.map((option) => option.quant)).toEqual([
			"Q4_K_M",
			"Q3_K_S",
			"Q4_0",
			"Q8_0",
			"IQ4_XS",
		]);
		expect(variants.groups).toEqual([
			{ id: "variants", label: "Variants", options: variants.options },
		]);
	});

	it("groups known fits, oversized variants, and unknown estimates in a stable order", () => {
		const catalog = makeCatalogModel({
			id: "org/model-GGUF:Q4_K_M",
			name: "org/model-GGUF",
			paramB: null,
			contextK: 128,
			variants: [
				variant({ quant: "unknown" }),
				variant({ quant: "large", sizeGb: 10 }),
				variant({ quant: "Q4_K_M", sizeGb: 2 }),
				variant({ quant: "small", sizeGb: 4 }),
			],
		});
		const hardware = makeHardware({ freeRamGb: 8, gpus: null });

		const variants = buildModelVariants({ catalog, hardware });

		expect(variants.groups.map((group) => group.id)).toEqual([
			"likely-fits",
			"may-be-too-large",
			"size-unknown",
		]);
		expect(variants.groups.map((group) => group.options.map((option) => option.quant))).toEqual([
			["Q4_K_M", "small"],
			["large"],
			["unknown"],
		]);
		expect(variants.options.find((option) => option.quant === "Q4_K_M")).toMatchObject({
			modelId: "org/model-GGUF:Q4_K_M",
			sizeGb: 2,
			contextK: 128,
			estimatedMemoryGb: 3.3,
			fit: "likely-fits",
		});
	});

	it("formats known option facts and falls back when none are available", () => {
		const detailed = buildModelVariants({
			catalog: makeCatalogModel({
				id: "org/model-GGUF:Q4_K_M",
				name: "org/model-GGUF",
				paramB: 8,
				sizeGb: 4.9,
				contextK: 128,
				variants: undefined,
			}),
			hardware: makeHardware({ freeRamGb: 16, gpus: null }),
		}).options[0];
		const unavailable = buildModelVariants({
			catalog: makeCatalogModel({
				id: "org/model-GGUF:unknown",
				name: "org/model-GGUF",
				paramB: null,
				sizeGb: null,
				contextK: null,
				variants: undefined,
			}),
			hardware: undefined,
		}).options[0];
		if (!detailed || !unavailable) throw new Error("expected synthesized options");

		expect(formatModelVariantDetails(detailed)).toBe(
			"4.9 GB download · 128K context · ~6.6 GB memory",
		);
		expect(formatModelVariantDetails(unavailable)).toBe("Details unavailable");
	});

	it("keeps a merged-in variant's own repo, so its pull target isn't the winning repo's", () => {
		const catalog = makeCatalogModel({
			id: "ggml-org/model-GGUF:Q4_K_M",
			name: "ggml-org/model-GGUF",
			variants: [
				variant({ quant: "Q4_K_M", sizeGb: 4, repoId: "ggml-org/model-GGUF" }),
				// Merged from a losing dedupe candidate; only that repo has this quant.
				variant({ quant: "Q8_0", sizeGb: 8, repoId: "unsloth/model-GGUF" }),
			],
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		const winning = variants.options.find((option) => option.quant === "Q4_K_M");
		const mergedIn = variants.options.find((option) => option.quant === "Q8_0");
		expect(winning).toMatchObject({
			modelId: "ggml-org/model-GGUF:Q4_K_M",
			isSameRepoAsPrimary: true,
		});
		expect(mergedIn).toMatchObject({
			modelId: "unsloth/model-GGUF:Q8_0",
			repoId: "unsloth/model-GGUF",
			isSameRepoAsPrimary: false,
		});
	});
});
