import { describe, expect, it } from "vitest";
import {
	buildModelVariants,
	formatModelVariantDetails,
} from "#/routes/_authenticated/library/-lib/model-variants";
import type { ModelTagInfo } from "#/shared/domain/model/types";
import { makeCatalogModel, makeHardware } from "#/test/factories";

function tag({
	tag,
	sizeGb = null,
	contextK = null,
}: {
	tag: string;
	sizeGb?: number | null;
	contextK?: number | null;
}): ModelTagInfo {
	return { tag, digest: null, sizeGb, contextK };
}

describe("buildModelVariants", () => {
	it("selects the catalog id's exact tag and scopes the picker to that size", () => {
		const catalog = makeCatalogModel({
			id: "llama3.1:8b",
			name: "llama3.1",
			variants: [
				tag({ tag: "70b", sizeGb: 40 }),
				tag({ tag: "8b-q8_0", sizeGb: 8.5 }),
				tag({ tag: "latest", sizeGb: 4.9 }),
				tag({ tag: "8b", sizeGb: 4.9 }),
			],
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		expect(variants.initialTag).toBe("8b");
		expect(variants.options.map((option) => option.tag)).toEqual(["8b", "8b-q8_0"]);
	});

	it("matches a composite size tag and only its hyphenated variants", () => {
		const catalog = makeCatalogModel({
			id: "qwen3:30b-a3b",
			name: "qwen3",
			variants: [
				tag({ tag: "30b-a3b-q4_K_M", sizeGb: 18.6 }),
				tag({ tag: "30b-q4_K_M", sizeGb: 18 }),
				tag({ tag: "235b-a22b", sizeGb: 142 }),
				tag({ tag: "30b-a3b", sizeGb: 18.6 }),
			],
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		expect(variants.options.map((option) => option.tag)).toEqual(["30b-a3b", "30b-a3b-q4_K_M"]);
	});

	it("keeps every tag for a bare catalog id", () => {
		const catalog = makeCatalogModel({
			id: "nomic-embed-text",
			name: "nomic-embed-text",
			variants: [
				tag({ tag: "v1.5", sizeGb: 0.3 }),
				tag({ tag: "latest", sizeGb: 0.4 }),
				tag({ tag: "137m", sizeGb: 0.2 }),
			],
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		expect(variants.initialTag).toBe("latest");
		expect(variants.options.map((option) => option.tag)).toEqual(["latest", "137m", "v1.5"]);
	});

	it("keeps every tag when the catalog's own tag is missing from the scrape", () => {
		const catalog = makeCatalogModel({
			id: "gemma3:7b",
			name: "gemma3",
			variants: [tag({ tag: "27b", sizeGb: 17 }), tag({ tag: "12b", sizeGb: 8 })],
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		expect(variants.initialTag).toBe("12b");
		expect(variants.options.map((option) => option.tag)).toEqual(["12b", "27b"]);
	});

	it("synthesizes the catalog variant and its metadata when enrichment has no tags", () => {
		const catalog = makeCatalogModel({
			id: "llama3.1:8b",
			name: "llama3.1",
			paramB: 8,
			sizeGb: 4.9,
			contextK: 128,
			variants: undefined,
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		expect(variants.options).toEqual([
			{
				tag: "8b",
				modelId: "llama3.1:8b",
				sizeGb: 4.9,
				contextK: 128,
				estimatedMemoryGb: 6.6,
				fit: null,
				isCurrent: true,
			},
		]);
	});

	it("orders the current tag first, then by size, then by tag", () => {
		const catalog = makeCatalogModel({
			id: "model:7b",
			name: "model",
			variants: [
				tag({ tag: "7b-z", sizeGb: null }),
				tag({ tag: "7b-b", sizeGb: 8 }),
				tag({ tag: "7b-small", sizeGb: 3 }),
				tag({ tag: "7b", sizeGb: 4 }),
				tag({ tag: "7b-a", sizeGb: 8 }),
			],
		});

		const variants = buildModelVariants({ catalog, hardware: undefined });

		expect(variants.options.map((option) => option.tag)).toEqual([
			"7b",
			"7b-small",
			"7b-a",
			"7b-b",
			"7b-z",
		]);
		expect(variants.groups).toEqual([
			{ id: "variants", label: "Variants", options: variants.options },
		]);
	});

	it("groups known fits, oversized variants, and unknown estimates in a stable order", () => {
		const catalog = makeCatalogModel({
			id: "model",
			name: "model",
			paramB: null,
			variants: [
				tag({ tag: "unknown" }),
				tag({ tag: "large", sizeGb: 10, contextK: 32 }),
				tag({ tag: "latest", sizeGb: 2, contextK: 128 }),
				tag({ tag: "small", sizeGb: 4 }),
			],
		});
		const hardware = makeHardware({ freeRamGb: 8, gpus: null });

		const variants = buildModelVariants({ catalog, hardware });

		expect(variants.groups.map((group) => group.id)).toEqual([
			"likely-fits",
			"may-be-too-large",
			"size-unknown",
		]);
		expect(variants.groups.map((group) => group.options.map((option) => option.tag))).toEqual([
			["latest", "small"],
			["large"],
			["unknown"],
		]);
		expect(variants.options.find((option) => option.tag === "latest")).toMatchObject({
			modelId: "model:latest",
			sizeGb: 2,
			contextK: 128,
			estimatedMemoryGb: 3.3,
			fit: "likely-fits",
		});
	});

	it("formats known option facts and falls back when none are available", () => {
		const detailed = buildModelVariants({
			catalog: makeCatalogModel({
				id: "model:8b",
				name: "model",
				paramB: 8,
				sizeGb: 4.9,
				contextK: 128,
				variants: undefined,
			}),
			hardware: makeHardware({ freeRamGb: 16, gpus: null }),
		}).options[0];
		const unavailable = buildModelVariants({
			catalog: makeCatalogModel({
				id: "model:unknown",
				name: "model",
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
});
