import { describe, expect, it } from "vitest";
import { llamacppUrlSchema } from "#/shared/lib/llamacpp/url";

describe("llamacppUrlSchema", () => {
	it("rejects a well-formed URL on a protocol llama-server doesn't speak", () => {
		expect(llamacppUrlSchema.safeParse({ url: "ftp://host" }).success).toBe(false);
	});

	it("normalizes to the origin so paths can be appended", () => {
		expect(llamacppUrlSchema.parse({ url: "http://localhost:8080/" }).url).toBe(
			"http://localhost:8080",
		);
	});
});
