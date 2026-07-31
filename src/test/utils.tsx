import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { render as baseRender, renderHook as baseRenderHook } from "vitest-browser-react";
import { TooltipProvider } from "#/shared/components/ui/tooltip";

/**
 * A client with retries off, so a rejected query settles immediately instead of
 * burning the retry budget. Isolation comes from building a fresh one per
 * render, not from expiring the cache: seeded data has to survive until the
 * hook reads it. Build one directly only when the test needs a handle on it (to
 * seed data or spy on invalidation) and hand it to {@link render} or
 * {@link renderHook}.
 */
export function testQueryClient(): QueryClient {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function testProviders(queryClient: QueryClient) {
	return function Providers({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				<TooltipProvider>{children}</TooltipProvider>
			</QueryClientProvider>
		);
	};
}

/** Browser-mode render wrapped in the app-wide providers. */
export function render(ui: ReactNode, { queryClient }: { queryClient?: QueryClient } = {}) {
	return baseRender(ui, { wrapper: testProviders(queryClient ?? testQueryClient()) });
}

/** Browser-mode `renderHook` with the same providers, for hooks that run queries. */
export function renderHook<Result>(
	hook: () => Result,
	{ queryClient }: { queryClient?: QueryClient } = {},
) {
	return baseRenderHook(hook, { wrapper: testProviders(queryClient ?? testQueryClient()) });
}
