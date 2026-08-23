import { describe, expect, it, vi } from "vitest";
import { useChatTools } from "#/routes/_authenticated/_chat/-hooks/use-chat-tools";
import { defaultEnabledTools } from "#/routes/_authenticated/_chat/-lib/tool-catalog";
import { renderHook, testQueryClient } from "#/test/utils";

vi.mock("#/shared/domain/endpoint/endpoint.functions", () => ({
	modelCapabilitiesQueryOptions: () => ({
		queryKey: ["model-capabilities"],
		queryFn: () => ({ supportsTools: true }),
	}),
}));

vi.mock("#/shared/domain/chat/tools.functions", () => ({
	toolAvailabilityQueryOptions: () => ({
		queryKey: ["tool-availability"],
		queryFn: () => ({ webSearch: false }),
		staleTime: Number.POSITIVE_INFINITY,
	}),
}));

function renderChatTools({ webSearch }: { webSearch: boolean }) {
	const queryClient = testQueryClient();
	queryClient.setQueryData(["tool-availability"], { webSearch });
	return renderHook(() => useChatTools({ selection: null }), { queryClient });
}

describe("defaultEnabledTools", () => {
	it("enables web search only when the server offers it", () => {
		expect(defaultEnabledTools({ webSearchAvailable: true })).toEqual(["web_search"]);
		expect(defaultEnabledTools({ webSearchAvailable: false })).toEqual([]);
	});

	it("prefers an explicit draft handoff over the server default", () => {
		expect(
			defaultEnabledTools({ webSearchAvailable: true, initialEnabledTools: ["memory"] }),
		).toEqual(["memory"]);
	});
});

describe("useChatTools", () => {
	it("starts with web search enabled when available", async () => {
		const { result } = await renderChatTools({ webSearch: true });
		expect(result.current.controls.enabledTools).toEqual(["web_search"]);
	});

	it("starts with no tools when web search is unavailable", async () => {
		const { result } = await renderChatTools({ webSearch: false });
		expect(result.current.controls.enabledTools).toEqual([]);
	});

	it("reset returns to the defaults after an explicit toggle", async () => {
		const { result, act } = await renderChatTools({ webSearch: true });
		await act(() => result.current.controls.onEnabledToolsChange(["memory"]));
		expect(result.current.controls.enabledTools).toEqual(["memory"]);
		await act(() => result.current.resetTools());
		expect(result.current.controls.enabledTools).toEqual(["web_search"]);
	});
});
