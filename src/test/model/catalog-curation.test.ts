import { describe, expect, it } from "vitest";
import {
	baseModelKey,
	dedupeByBaseModel,
	deriveDisplayName,
	isChatModel,
	pickDefaultVariant,
} from "#/shared/domain/model/catalog-curation";
import { isMmprojFile, parseQuantFromFilename, parseShardParts } from "#/shared/domain/model/gguf";
import { parseParamB } from "#/shared/domain/model/model-id";

describe("parseQuantFromFilename", () => {
	it("matches known quants, longest token first", () => {
		expect(parseQuantFromFilename("gemma-3-4b-it-Q4_K_M.gguf")).toBe("Q4_K_M");
		expect(parseQuantFromFilename("model-Q4_0.gguf")).toBe("Q4_0");
	});

	it("resolves formats a plain regex would miss", () => {
		expect(parseQuantFromFilename("gpt-oss-20b-MXFP4.gguf")).toBe("MXFP4");
		expect(parseQuantFromFilename("gpt-oss-120b-MXFP4_MOE.gguf")).toBe("MXFP4_MOE");
		expect(parseQuantFromFilename("model-TQ1_0.gguf")).toBe("TQ1_0");
	});

	it("returns null when no known quant token is present", () => {
		expect(parseQuantFromFilename("README.gguf")).toBeNull();
	});
});

describe("isMmprojFile / parseShardParts", () => {
	it("identifies multimodal projector files", () => {
		expect(isMmprojFile("mmproj-model-f16.gguf")).toBe(true);
		expect(isMmprojFile("vision/mmproj-model-f16.gguf")).toBe(true);
		expect(isMmprojFile("model-Q4_K_M.gguf")).toBe(false);
	});

	it("parses sharded filenames and rejects non-sharded ones", () => {
		expect(parseShardParts("model-Q4_K_M-00001-of-00002.gguf")).toEqual({
			prefix: "model-Q4_K_M",
			part: 1,
			total: 2,
		});
		expect(parseShardParts("model-Q4_K_M.gguf")).toBeNull();
	});
});

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

describe("isChatModel", () => {
	it("keeps text-generation and image-text-to-text pipeline tags", () => {
		expect(isChatModel({ pipelineTag: "text-generation", tags: [] })).toBe(true);
		expect(isChatModel({ pipelineTag: "image-text-to-text", tags: [] })).toBe(true);
	});

	it("rejects other pipeline tags outright", () => {
		expect(isChatModel({ pipelineTag: "automatic-speech-recognition", tags: [] })).toBe(false);
	});

	it("falls back to the conversational tag when pipeline_tag is absent", () => {
		expect(isChatModel({ pipelineTag: undefined, tags: ["conversational"] })).toBe(true);
		expect(isChatModel({ pipelineTag: undefined, tags: ["feature-extraction"] })).toBe(false);
		expect(isChatModel({ pipelineTag: undefined, tags: [] })).toBe(false);
	});
});

describe("baseModelKey / deriveDisplayName", () => {
	it("strips org, GGUF suffix, and repack markers to collide repacks", () => {
		expect(baseModelKey("unsloth/Qwen3-8B-GGUF")).toBe(baseModelKey("ggml-org/Qwen3-8B-it-GGUF"));
	});

	it("derives a clean display name", () => {
		expect(deriveDisplayName("unsloth/Qwen3.5-4B-GGUF")).toBe("Qwen3.5 4B");
		expect(deriveDisplayName("ggml-org/gemma-4-12B-it-GGUF")).toBe("Gemma 4 12B");
	});
});

describe("dedupeByBaseModel", () => {
	it("collapses repacks to the best-ranked publisher and merges variants", () => {
		const merged = dedupeByBaseModel([
			{
				name: "unsloth/Qwen3-8B-GGUF",
				paramB: 8,
				capabilities: [],
				updatedAt: undefined,
				pullCount: 100,
				variants: [{ quant: "Q4_K_M", sizeGb: 5, fileName: "a" }],
			},
			{
				name: "ggml-org/Qwen3-8B-GGUF",
				paramB: 8,
				capabilities: [],
				updatedAt: undefined,
				pullCount: 50,
				variants: [{ quant: "Q8_0", sizeGb: 9, fileName: "b" }],
			},
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0]?.name).toBe("ggml-org/Qwen3-8B-GGUF");
		expect(merged[0]?.variants.map((v) => v.quant).sort()).toEqual(["Q4_K_M", "Q8_0"]);
	});

	it("keeps unrelated models separate", () => {
		const merged = dedupeByBaseModel([
			{
				name: "org/model-a-8B-GGUF",
				paramB: 8,
				capabilities: [],
				updatedAt: undefined,
				pullCount: 1,
				variants: [{ quant: "Q4_K_M", sizeGb: 5, fileName: "a" }],
			},
			{
				name: "org/model-b-8B-GGUF",
				paramB: 8,
				capabilities: [],
				updatedAt: undefined,
				pullCount: 1,
				variants: [{ quant: "Q4_K_M", sizeGb: 5, fileName: "b" }],
			},
		]);
		expect(merged).toHaveLength(2);
	});
});

describe("pickDefaultVariant", () => {
	it("prefers Q4_K_M over the largest file", () => {
		const variants = [
			{ quant: "Q4_K_M", sizeGb: 2.5, fileName: "a" },
			{ quant: "Q8_0", sizeGb: 4.5, fileName: "b" },
			{ quant: "BF16", sizeGb: 8, fileName: "c" },
		];
		expect(pickDefaultVariant(variants)?.quant).toBe("Q4_K_M");
	});

	it("falls back to the largest variant under 8GB when no preferred quant exists", () => {
		const variants = [
			{ quant: "IQ2_M", sizeGb: 3, fileName: "a" },
			{ quant: "F32", sizeGb: 20, fileName: "b" },
		];
		expect(pickDefaultVariant(variants)?.quant).toBe("IQ2_M");
	});

	it("returns null for an empty list", () => {
		expect(pickDefaultVariant([])).toBeNull();
	});
});
