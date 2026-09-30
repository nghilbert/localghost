import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { RouteErrorScreen } from "#/components/layout/RouteErrorScreen";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 10_000,
				gcTime: 5 * 60_000,
			},
		},
	});
	const router = createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultErrorComponent: RouteErrorScreen,
		defaultPreload: "intent",
		// Browsers without view transitions just navigate.
		defaultViewTransition: true,
	});
	setupRouterSsrQueryIntegration({ router, queryClient });
	return router;
}
