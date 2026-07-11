import type { UIMessage } from "@tanstack/ai-client";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { saveConversationMessages, deleteConversation, toastError } = vi.hoisted(() => ({
	saveConversationMessages: vi.fn(),
	deleteConversation: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock("#/entities/conversation/conversation.functions", () => ({
	saveConversationMessages,
	deleteConversation,
	conversationQueryOptions: (id: string) => ({ queryKey: ["conversation", id] }),
	conversationsQueryOptions: () => ({ queryKey: ["conversations"] }),
}));

vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }));

import { createChatPersistence, flushAll } from "#/features/send-message/lib/chat-client";

function message(id: string, content: string): UIMessage {
	return { id, role: "user", parts: [{ type: "text", content }] };
}

const queryKey = (id: string) => ["conversation", id];

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	saveConversationMessages.mockResolvedValue(undefined);
	deleteConversation.mockResolvedValue(undefined);
});

afterEach(() => {
	// Drain any timers still pending so state never leaks into the next test's module-level map.
	vi.runOnlyPendingTimers();
	vi.useRealTimers();
});

describe("createChatPersistence: setItem debounce", () => {
	it("saves once per burst with the latest snapshot", () => {
		const persistence = createChatPersistence(new QueryClient());

		persistence.setItem("c1", [message("m1", "a")]);
		persistence.setItem("c1", [message("m1", "a"), message("m2", "b")]);
		vi.advanceTimersByTime(499);
		expect(saveConversationMessages).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(saveConversationMessages).toHaveBeenCalledTimes(1);
		expect(saveConversationMessages).toHaveBeenCalledWith({
			data: { id: "c1", messages: [message("m1", "a"), message("m2", "b")] },
		});
	});

	it("snapshots by value, so mutating the array after setItem doesn't change what saves", () => {
		const persistence = createChatPersistence(new QueryClient());
		const live = [message("m1", "a")];

		persistence.setItem("c1", live);
		live.push(message("m2", "b"));
		vi.advanceTimersByTime(500);

		expect(saveConversationMessages).toHaveBeenCalledWith({
			data: { id: "c1", messages: [message("m1", "a")] },
		});
	});
});

describe("createChatPersistence: commit write-back", () => {
	it("writes the saved snapshot back into the conversation cache on success", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(queryKey("c1"), { id: "c1", title: "t", messages: [] });
		const persistence = createChatPersistence(queryClient);

		persistence.setItem("c1", [message("m1", "a")]);
		await vi.advanceTimersByTimeAsync(500);

		expect(queryClient.getQueryData(queryKey("c1"))).toEqual({
			id: "c1",
			title: "t",
			messages: [message("m1", "a")],
		});
	});

	it("leaves the cache untouched and toasts when the save fails (no false 'saved' cache)", async () => {
		saveConversationMessages.mockRejectedValue(new Error("boom"));
		const queryClient = new QueryClient();
		queryClient.setQueryData(queryKey("c1"), { id: "c1", messages: [] });
		const persistence = createChatPersistence(queryClient);

		persistence.setItem("c1", [message("m1", "a")]);
		await vi.advanceTimersByTimeAsync(500);

		expect(queryClient.getQueryData(queryKey("c1"))).toEqual({ id: "c1", messages: [] });
		expect(toastError).toHaveBeenCalledWith("Failed to save the conversation");
	});
});

describe("flushAll", () => {
	it("commits pending saves immediately with a keepalive fetch", () => {
		const persistence = createChatPersistence(new QueryClient());
		persistence.setItem("c1", [message("m1", "a")]);

		flushAll();

		expect(saveConversationMessages).toHaveBeenCalledTimes(1);
		const [arg] = saveConversationMessages.mock.calls[0] ?? [];
		expect(arg.data).toEqual({ id: "c1", messages: [message("m1", "a")] });
		expect(arg.fetch).toBeTypeOf("function");
	});

	it("does not double-save when the debounce timer fires after a flush", () => {
		const persistence = createChatPersistence(new QueryClient());
		persistence.setItem("c1", [message("m1", "a")]);

		flushAll();
		vi.advanceTimersByTime(500);

		expect(saveConversationMessages).toHaveBeenCalledTimes(1);
	});
});

describe("createChatPersistence: removeItem", () => {
	it("cancels a pending save before deleting so the deleted conversation isn't re-saved", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(queryKey("c1"), { id: "c1", messages: [] });
		const persistence = createChatPersistence(queryClient);

		persistence.setItem("c1", [message("m1", "a")]);
		await persistence.removeItem("c1");
		vi.advanceTimersByTime(500);

		expect(saveConversationMessages).not.toHaveBeenCalled();
		expect(deleteConversation).toHaveBeenCalledWith({ data: { id: "c1" } });
		expect(queryClient.getQueryData(queryKey("c1"))).toBeUndefined();
	});
});

describe("createChatPersistence: concurrent saves", () => {
	/** Makes each save hang until its matching `release` is called, exposing resolve order. */
	function deferredSaves() {
		const releases: Array<() => void> = [];
		saveConversationMessages.mockImplementation(
			() => new Promise<void>((resolve) => releases.push(resolve)),
		);
		return releases;
	}

	it("serializes overlapping saves so the newest snapshot lands last, not the last to resolve", async () => {
		const releases = deferredSaves();
		const queryClient = new QueryClient();
		queryClient.setQueryData(queryKey("c9"), { id: "c9", messages: [] });
		const persistence = createChatPersistence(queryClient);

		// First save is dispatched and left in flight.
		persistence.setItem("c9", [message("m1", "a")]);
		await vi.advanceTimersByTimeAsync(500);
		expect(saveConversationMessages).toHaveBeenCalledTimes(1);

		// A newer save is committed while the first is still pending: it must wait.
		persistence.setItem("c9", [message("m1", "a"), message("m2", "b")]);
		await vi.advanceTimersByTimeAsync(500);
		expect(saveConversationMessages).toHaveBeenCalledTimes(1);

		// Resolving the first save releases the second, which only now dispatches.
		releases[0]?.();
		await vi.advanceTimersByTimeAsync(0);
		expect(saveConversationMessages).toHaveBeenCalledTimes(2);
		// The stale first save must not clobber the cache with its older snapshot.
		expect(queryClient.getQueryData(queryKey("c9"))).toEqual({ id: "c9", messages: [] });

		releases[1]?.();
		await vi.advanceTimersByTimeAsync(0);
		expect(queryClient.getQueryData(queryKey("c9"))).toEqual({
			id: "c9",
			messages: [message("m1", "a"), message("m2", "b")],
		});
	});
});

describe("createChatPersistence: sidebar reorder", () => {
	it("invalidates the conversations list after a successful save so Recent Chats re-sorts", async () => {
		const queryClient = new QueryClient();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		const persistence = createChatPersistence(queryClient);

		persistence.setItem("c8", [message("m1", "a")]);
		await vi.advanceTimersByTimeAsync(500);

		expect(invalidate).toHaveBeenCalledWith({ queryKey: ["conversations"] });
	});
});

describe("createChatPersistence: getItem", () => {
	it("answers synchronously from the cache with a detached clone", () => {
		const queryClient = new QueryClient();
		const cachedMessages = [message("m1", "a")];
		queryClient.setQueryData(queryKey("c1"), { id: "c1", messages: cachedMessages });
		const persistence = createChatPersistence(queryClient);

		const result = persistence.getItem("c1");

		expect(result).toEqual(cachedMessages);
		expect(result).not.toBe(cachedMessages);
	});
});
