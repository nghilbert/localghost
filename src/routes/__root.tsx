import { aiDevtoolsPlugin } from "@tanstack/react-ai-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { NotFoundScreen } from "#/components/layout/NotFoundScreen";
import { Toaster } from "#/components/ui/toast";
import { Tooltip } from "#/components/ui/tooltip";
import { getAuthSession } from "#/features/account/account.functions";
import { ThemeProvider } from "#/lib/theme/theme-provider";
import stylesCss from "#/styles/index.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
	beforeLoad: async () => ({ auth: await getAuthSession() }),
	component: RootDocument,
	notFoundComponent: NotFoundScreen,
	head: () => ({
		meta: [{ title: "localghost" }, { name: "description", content: "Self-hosted AI workspace" }],
		links: [
			{ rel: "icon", href: "/favicon.svg" },
			{ rel: "manifest", href: "/manifest.json" },
			{ rel: "stylesheet", href: stylesCss },
		],
	}),
});

function RootDocument() {
	const { queryClient } = Route.useRouteContext();

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			</head>

			<body className="h-dvh overflow-hidden flex flex-col bg-bg text-fg">
				<QueryClientProvider client={queryClient}>
					<ThemeProvider defaultMode="system">
						<Tooltip.Provider>
							<Outlet />
							<Toaster />
							<TanStackDevtools
								plugins={[
									{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
									{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
									aiDevtoolsPlugin(),
									formDevtoolsPlugin(),
								]}
								eventBusConfig={{ connectToServerBus: true }}
							/>
						</Tooltip.Provider>
					</ThemeProvider>
				</QueryClientProvider>

				<Scripts />
			</body>
		</html>
	);
}
