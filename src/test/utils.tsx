import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { render as baseRender, renderHook as baseRenderHook } from "vitest-browser-react";
import { Tooltip } from "#/components/ui/tooltip";

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
				<Tooltip.Provider>{children}</Tooltip.Provider>
			</QueryClientProvider>
		);
	};
}

/** Browser-mode render wrapped in the app-wide providers. */
export function render(ui: ReactNode, { queryClient }: { queryClient?: QueryClient } = {}) {
	return baseRender(ui, { wrapper: testProviders(queryClient ?? testQueryClient()) });
}

/** Like {@link render}, inside a memory router at `/test`, for components that render links. */
export function renderWithRouter(
	ui: ReactNode,
	{ queryClient }: { queryClient?: QueryClient } = {},
) {
	const rootRoute = createRootRoute({ component: () => <Outlet /> });
	const homeRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: () => <p>home</p>,
	});
	const testRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/test",
		component: () => ui,
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([homeRoute, testRoute]),
		history: createMemoryHistory({ initialEntries: ["/test"] }),
	});

	return render(<RouterProvider router={router} />, { queryClient });
}

/** Browser-mode `renderHook` with the same providers, for hooks that run queries. */
export function renderHook<Result>(
	hook: () => Result,
	{ queryClient }: { queryClient?: QueryClient } = {},
) {
	return baseRenderHook(hook, { wrapper: testProviders(queryClient ?? testQueryClient()) });
}
