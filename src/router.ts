import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { RouteErrorScreen } from "#/components/layout/RouteErrorScreen";
import { MS_PER_MINUTE, MS_PER_SECOND } from "#/lib/format";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 10 * MS_PER_SECOND,
				gcTime: 5 * MS_PER_MINUTE,
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
