import { describe, expect, it } from "vitest";
import { perModelOptionsSchema } from "#/shared/domain/model-setting/schemas";

describe("perModelOptionsSchema", () => {
	it("keeps every curated sampling option", () => {
		const options = {
			temperature: 0.5,
			top_p: 0.9,
			top_k: 40,
			repeat_penalty: 1.1,
			max_tokens: 512,
		};
		expect(perModelOptionsSchema.parse(options)).toEqual(options);
	});

	it("drops a field outside the curated subset instead of passing it through", () => {
		expect(perModelOptionsSchema.parse({ temperature: 0.5, mirostat: 1 })).toEqual({
			temperature: 0.5,
		});
	});
});
