import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentConnection } from "#/routes/_authenticated/_agent/agent/-lib/connection";

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("createAgentConnection().hydrate", () => {
	it("revives createdAt back into a real Date on the hydration response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				jsonResponse({
					messages: [{ id: "m1", role: "user", createdAt: "2026-01-15T10:30:00.000Z" }],
				}),
			),
		);

		const result = await createAgentConnection().hydrate?.("t1");
		const createdAt = result?.messages[0]?.createdAt;

		expect(createdAt).toBeInstanceOf(Date);
		if (createdAt instanceof Date) expect(createdAt.toISOString()).toBe("2026-01-15T10:30:00.000Z");
	});

	it("leaves a message with no createdAt untouched", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(jsonResponse({ messages: [{ id: "m1", role: "user" }] })),
		);

		const result = await createAgentConnection().hydrate?.("t1");

		expect(result?.messages[0]?.createdAt).toBeUndefined();
	});

	it("passes through an empty transcript unchanged", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ messages: [] })));

		const result = await createAgentConnection().hydrate?.("t1");

		expect(result?.messages).toEqual([]);
	});
});
