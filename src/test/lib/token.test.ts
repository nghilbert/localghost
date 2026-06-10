import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashToken } from "#/lib/token.server";

describe("hashToken", () => {
	it("returns a sha256 hex string", () => {
		const result = hashToken("ody_test123");
		expect(result).toMatch(/^[0-9a-f]{64}$/);
	});

	it("is deterministic", () => {
		const token = "ody_abc";
		expect(hashToken(token)).toBe(hashToken(token));
	});

	it("produces different hashes for different inputs", () => {
		expect(hashToken("ody_aaa")).not.toBe(hashToken("ody_bbb"));
	});

	it("matches node crypto sha256 directly", () => {
		const raw = "ody_sometoken";
		const expected = createHash("sha256").update(raw).digest("hex");
		expect(hashToken(raw)).toBe(expected);
	});
});
