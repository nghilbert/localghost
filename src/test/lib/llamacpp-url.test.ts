import { describe, expect, it } from "vitest";
import { llamacppUrlSchema } from "#/shared/lib/llamacpp/url";

describe("llamacppUrlSchema", () => {
	it.each(["http://localhost:8080", "https://llamacpp.example.com", "http://192.168.1.50:8080"])(
		"accepts %s",
		(url) => {
			expect(llamacppUrlSchema.safeParse({ url }).success).toBe(true);
		},
	);

	it.each(["not-a-url", "ftp://host", "localhost:8080", ""])("rejects %j", (url) => {
		expect(llamacppUrlSchema.safeParse({ url }).success).toBe(false);
	});

	it("normalizes to the origin so paths can be appended", () => {
		expect(llamacppUrlSchema.parse({ url: "http://localhost:8080/" }).url).toBe(
			"http://localhost:8080",
		);
	});
});
