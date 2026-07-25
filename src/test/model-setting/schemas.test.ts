import { describe, expect, it } from "vitest";
import { perModelOptionsSchema } from "#/shared/domain/model-setting/schemas";

describe("perModelOptionsSchema", () => {
	it("accepts the curated subset of sampling options", () => {
		const result = perModelOptionsSchema.safeParse({
			temperature: 0.5,
			top_p: 0.9,
			top_k: 40,
			repeat_penalty: 1.1,
			max_tokens: 512,
		});
		expect(result.success).toBe(true);
	});

	it("accepts an empty object, every field optional", () => {
		expect(perModelOptionsSchema.safeParse({}).success).toBe(true);
	});

	it("rejects a field outside the curated subset", () => {
		const result = perModelOptionsSchema.safeParse({ mirostat: 1 });
		expect(result.success && Object.keys(result.data).includes("mirostat")).toBe(false);
	});

	it("rejects an out-of-range temperature", () => {
		expect(perModelOptionsSchema.safeParse({ temperature: -1 }).success).toBe(false);
	});
});
