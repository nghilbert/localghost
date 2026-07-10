import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useChatTools } from "#/features/send-message/hooks/use-chat-tools";
import { defaultEnabledTools } from "#/features/send-message/lib/tool-catalog";

vi.mock("#/entities/endpoint/endpoint.functions", () => ({
	modelCapabilitiesQueryOptions: () => ({
		queryKey: ["model-capabilities"],
		queryFn: () => ({ supportsTools: true }),
	}),
}));

vi.mock("#/features/send-message/lib/tools.functions", () => ({
	toolAvailabilityQueryOptions: () => ({
		queryKey: ["tool-availability"],
		queryFn: () => ({ webSearch: false }),
		staleTime: Number.POSITIVE_INFINITY,
	}),
}));

function renderChatTools({ webSearch }: { webSearch: boolean }) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(["tool-availability"], { webSearch });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useChatTools({ selection: null }), { wrapper });
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
	it("starts with web search enabled when available", () => {
		const { result } = renderChatTools({ webSearch: true });
		expect(result.current.controls.enabledTools).toEqual(["web_search"]);
	});

	it("starts with no tools when web search is unavailable", () => {
		const { result } = renderChatTools({ webSearch: false });
		expect(result.current.controls.enabledTools).toEqual([]);
	});

	it("reset returns to the defaults after an explicit toggle", () => {
		const { result } = renderChatTools({ webSearch: true });
		act(() => result.current.controls.onEnabledToolsChange(["memory"]));
		expect(result.current.controls.enabledTools).toEqual(["memory"]);
		act(() => result.current.resetTools());
		expect(result.current.controls.enabledTools).toEqual(["web_search"]);
	});
});
