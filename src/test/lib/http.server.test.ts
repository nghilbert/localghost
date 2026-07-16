import { describe, expect, it } from "vitest";
import { BodyTooLargeError, readJsonWithLimit } from "#/shared/lib/http.server";

function jsonRequest(body: string, headers: Record<string, string> = {}): Request {
	return new Request("http://test.local/", { method: "POST", body, headers });
}

describe("readJsonWithLimit", () => {
	it("parses a body within the limit", async () => {
		const result = await readJsonWithLimit({
			request: jsonRequest(JSON.stringify({ ok: true })),
			maxBytes: 1024,
		});
		expect(result).toEqual({ ok: true });
	});

	it("rejects early on a declared Content-Length over the limit", async () => {
		// A tiny actual body: the declared size alone must trigger the rejection.
		const request = jsonRequest("{}", { "content-length": "2048" });
		await expect(readJsonWithLimit({ request, maxBytes: 1024 })).rejects.toThrow(BodyTooLargeError);
	});

	it("rejects while streaming when the body outgrows the limit", async () => {
		// A string body declares no Content-Length, so the streamed byte count
		// must enforce the cap.
		const request = jsonRequest(JSON.stringify({ data: "x".repeat(4096) }));
		expect(request.headers.get("content-length")).toBeNull();
		await expect(readJsonWithLimit({ request, maxBytes: 1024 })).rejects.toThrow(BodyTooLargeError);
	});

	it("throws SyntaxError on invalid JSON within the limit", async () => {
		await expect(
			readJsonWithLimit({ request: jsonRequest("not json"), maxBytes: 1024 }),
		).rejects.toThrow(SyntaxError);
	});
});
