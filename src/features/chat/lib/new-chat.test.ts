import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storeNewChat, takeNewChat } from "./new-chat";

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

describe("takeNewChat", () => {
	it("round-trips stored toggles and clears them", () => {
		storeNewChat({ conversationId: "c1", newChat: { enabledTools: ["web_search"] } });

		expect(takeNewChat("c1")).toEqual({ enabledTools: ["web_search"] });
		expect(takeNewChat("c1")).toBeNull();
	});

	it("returns null when nothing was stored", () => {
		expect(takeNewChat("missing")).toBeNull();
	});

	it("returns null for a malformed shape (stale entry across a deploy)", () => {
		sessionStorage.setItem("new-chat:c1", JSON.stringify({ enabledTools: "web_search" }));
		expect(takeNewChat("c1")).toBeNull();
	});

	it("returns null for unparseable JSON", () => {
		sessionStorage.setItem("new-chat:c1", "{not json");
		expect(takeNewChat("c1")).toBeNull();
	});
});
