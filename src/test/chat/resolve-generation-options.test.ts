import { describe, expect, it } from "vitest";
import { resolveGenerationOptions } from "#/shared/domain/chat/resolve-generation-options";

describe("resolveGenerationOptions", () => {
	it("falls back to the user's global temperature when nothing overrides it", () => {
		const result = resolveGenerationOptions({
			userTemperature: 0.7,
			endpointOptions: undefined,
			modelOptions: undefined,
		});
		expect(result.temperature).toBe(0.7);
	});

	it("a per-model temperature wins over the user's global default", () => {
		const result = resolveGenerationOptions({
			userTemperature: 0.7,
			endpointOptions: undefined,
			modelOptions: { temperature: 0.2 },
		});
		expect(result.temperature).toBe(0.2);
	});

	it("model options win over endpoint options for the same key", () => {
		const result = resolveGenerationOptions({
			userTemperature: null,
			endpointOptions: { num_ctx: 4096, top_p: 0.9 },
			modelOptions: { num_ctx: 16384 },
		});
		expect(result.options).toEqual({ num_ctx: 16384, top_p: 0.9 });
	});

	it("has no temperature when neither the user nor the model sets one", () => {
		const result = resolveGenerationOptions({
			userTemperature: null,
			endpointOptions: undefined,
			modelOptions: undefined,
		});
		expect(result.temperature).toBeUndefined();
	});
});
