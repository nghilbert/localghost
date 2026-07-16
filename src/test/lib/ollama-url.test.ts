import { describe, expect, it } from "vitest";
import { ollamaUrlSchema } from "#/shared/lib/ollama/url";

describe("ollamaUrlSchema", () => {
	it.each(["http://localhost:11434", "https://ollama.example.com", "http://192.168.1.50:11434"])(
		"accepts %s",
		(url) => {
			expect(ollamaUrlSchema.safeParse({ url }).success).toBe(true);
		},
	);

	it.each(["not-a-url", "ftp://host", "localhost:11434", ""])("rejects %j", (url) => {
		expect(ollamaUrlSchema.safeParse({ url }).success).toBe(false);
	});

	it("normalizes to the origin so paths can be appended", () => {
		expect(ollamaUrlSchema.parse({ url: "http://localhost:11434/" }).url).toBe(
			"http://localhost:11434",
		);
	});
});
