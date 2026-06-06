import { describe, expect, it } from "vitest";
import { extractJson } from "./research.server";

describe("extractJson", () => {
	it("returns a bare JSON object unchanged", () => {
		const input = '{"key": "value"}';
		expect(extractJson(input)).toBe(input);
	});

	it("returns a bare JSON array unchanged", () => {
		const input = '["a", "b", "c"]';
		expect(extractJson(input)).toBe(input);
	});

	it("extracts JSON object from surrounding prose", () => {
		const input =
			'Sure! Here is the plan: {"sub_questions": ["q1", "q2"]} Let me know if you need more.';
		const result = extractJson(input);
		expect(result).toContain('"sub_questions"');
		const parsed = JSON.parse(result) as { sub_questions: string[] };
		expect(parsed.sub_questions).toEqual(["q1", "q2"]);
	});

	it("extracts JSON array from surrounding prose", () => {
		const input = 'Here are queries: ["search this", "search that"]. Use them wisely.';
		const result = extractJson(input);
		const parsed = JSON.parse(result) as string[];
		expect(parsed).toEqual(["search this", "search that"]);
	});

	it("returns original text when no JSON is present", () => {
		const input = "Just plain text with no JSON here.";
		expect(extractJson(input)).toBe(input);
	});

	it("handles multiline JSON", () => {
		const input = 'Response:\n{\n  "a": 1,\n  "b": 2\n}\nEnd.';
		const result = extractJson(input);
		const parsed = JSON.parse(result) as { a: number; b: number };
		expect(parsed.a).toBe(1);
		expect(parsed.b).toBe(2);
	});
});
