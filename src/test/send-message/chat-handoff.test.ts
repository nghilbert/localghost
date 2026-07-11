import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storeChatHandoff, takeChatHandoff } from "#/features/send-message/lib/chat-handoff";

function fakeSessionStorage(): Storage {
	const store = new Map<string, string>();
	return {
		getItem: (k) => store.get(k) ?? null,
		setItem: (k, v) => void store.set(k, v),
		removeItem: (k) => void store.delete(k),
		clear: () => store.clear(),
		key: (i) => [...store.keys()][i] ?? null,
		get length() {
			return store.size;
		},
	};
}

beforeEach(() => {
	vi.stubGlobal("sessionStorage", fakeSessionStorage());
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("takeChatHandoff", () => {
	it("round-trips a stored handoff and clears it", () => {
		storeChatHandoff({ conversationId: "c1", handoff: { enabledTools: ["web_search"] } });

		expect(takeChatHandoff("c1")).toEqual({ enabledTools: ["web_search"] });
		expect(takeChatHandoff("c1")).toBeNull();
	});

	it("returns null when nothing was stored", () => {
		expect(takeChatHandoff("missing")).toBeNull();
	});

	it("returns null for a malformed shape (stale entry across a deploy)", () => {
		sessionStorage.setItem("chat-handoff:c1", JSON.stringify({ enabledTools: "web_search" }));
		expect(takeChatHandoff("c1")).toBeNull();
	});

	it("returns null for unparseable JSON", () => {
		sessionStorage.setItem("chat-handoff:c1", "{not json");
		expect(takeChatHandoff("c1")).toBeNull();
	});
});
