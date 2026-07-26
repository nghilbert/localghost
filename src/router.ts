import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { RouteErrorScreen } from "#/shared/components/RouteErrorScreen";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				// Brief navigations reuse cached data instead of refetching on every mount.
				staleTime: 10_000,
				// Keep cache entries (and in-flight data) for a few minutes after unmount.
				gcTime: 5 * 60_000,
			},
		},
	});
	const router = createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultErrorComponent: RouteErrorScreen,
		// Preload a route's loader on link hover/focus, not just on click.
		defaultPreload: "intent",
	});
	setupRouterSsrQueryIntegration({ router, queryClient });
	return router;
}
