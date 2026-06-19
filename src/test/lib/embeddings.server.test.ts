import { describe, expect, it } from "vitest";
import { toVectorLiteral } from "#/lib/tools/embeddings.server";

describe("toVectorLiteral", () => {
	it("formats an empty array", () => {
		expect(toVectorLiteral([])).toBe("[]");
	});

	it("formats a single-element array", () => {
		expect(toVectorLiteral([0.5])).toBe("[0.5]");
	});

	it("formats a multi-element array", () => {
		expect(toVectorLiteral([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
	});

	it("preserves floating-point precision", () => {
		const v = [1.234567890123456, -0.000001, 0.9999999];
		const literal = toVectorLiteral(v);
		expect(literal).toMatch(/^\[[\d.,e+-]+\]$/);
		const parsed = JSON.parse(literal) as number[];
		expect(parsed).toHaveLength(3);
	});
});
