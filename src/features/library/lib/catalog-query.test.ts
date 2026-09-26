import { describe, expect, it } from "vitest";
import { makeCatalogModel, makeHardware } from "#/test/factories";
import { catalogSearchText, compareModels, isFitHidden } from "./catalog-query";

describe("compareModels", () => {
	const small = makeCatalogModel({ displayName: "Beta", sizeGb: 2, paramB: 3 });
	const large = makeCatalogModel({ displayName: "alpha", sizeGb: 9, paramB: 14 });
	const unsized = makeCatalogModel({ displayName: "Gamma", sizeGb: null, paramB: null });

	it("orders by the field in the given direction", () => {
		expect(compareModels({ left: small, right: large, sortBy: "sizeGb", sortDir: "asc" })).toBe(-1);
		expect(compareModels({ left: small, right: large, sortBy: "sizeGb", sortDir: "desc" })).toBe(1);
	});

	it("sorts names case-insensitively", () => {
		expect(compareModels({ left: small, right: large, sortBy: "name", sortDir: "asc" })).toBe(1);
	});

	it("puts a missing size below every known one", () => {
		expect(compareModels({ left: unsized, right: small, sortBy: "memory", sortDir: "asc" })).toBe(
			-1,
		);
	});
});

describe("catalogSearchText", () => {
	it("joins the names and tags", () => {
		expect(
			catalogSearchText({ displayName: "Gemma 3", name: "ggml-org/gemma-3", tags: ["vision"] }),
		).toBe("Gemma 3 ggml-org/gemma-3 vision");
	});
});

describe("isFitHidden", () => {
	const hardware = makeHardware({ freeRamGb: 8, totalRamGb: 16, gpus: null });

	it("hides a model whose fit is in the hidden list", () => {
		const huge = { sizeGb: 40, paramB: null };
		expect(isFitHidden({ model: huge, hardware, hiddenFits: ["wont-fit"] })).toBe(true);
		expect(isFitHidden({ model: huge, hardware, hiddenFits: ["tight"] })).toBe(false);
	});

	it("hides nothing when the hardware is unknown", () => {
		const huge = { sizeGb: 40, paramB: null };
		expect(isFitHidden({ model: huge, hardware: undefined, hiddenFits: ["wont-fit"] })).toBe(false);
	});
});
