import { describe, expect, it } from "vitest";
import { normalizeModelId } from "#/shared/lib/utils";

describe("normalizeModelId", () => {
	it("strips the implicit :latest tag", () => {
		expect(normalizeModelId("llama3.1:latest")).toBe("llama3.1");
	});

	it("leaves other tags untouched", () => {
		expect(normalizeModelId("llama3.1:8b")).toBe("llama3.1:8b");
	});

	it("leaves bare names untouched", () => {
		expect(normalizeModelId("llama3.1")).toBe("llama3.1");
	});
});
