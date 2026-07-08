import { aiDevtoolsPlugin } from "@tanstack/react-ai-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { Toaster } from "#/components/ui/sonner";
import { TooltipProvider } from "#/components/ui/tooltip";
import { getAuthSession } from "#/features/auth/lib/auth.functions";
import { ThemeProvider } from "#/features/theme/components/ThemeContext";
import globalCss from "#/lib/globals.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
	beforeLoad: async () => ({ auth: await getAuthSession() }),
	component: RootDocument,
	notFoundComponent: NotFound,
	head: () => ({
		meta: [{ title: "localghost" }, { name: "description", content: "Self-hosted AI workspace" }],
		links: [
			{ rel: "icon", href: "/favicon.ico" },
			{ rel: "manifest", href: "/manifest.json" },
			{ rel: "stylesheet", href: globalCss },
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

			<body className="h-dvh overflow-hidden flex flex-col bg-background text-foreground">
				<QueryClientProvider client={queryClient}>
					<ThemeProvider defaultMode="system">
						<TooltipProvider>
							<Outlet />
							<Toaster richColors position="bottom-right" />
							<TanStackDevtools
								plugins={[
									{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
									{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
									aiDevtoolsPlugin(),
									formDevtoolsPlugin(),
								]}
								eventBusConfig={{ connectToServerBus: true }}
							/>
						</TooltipProvider>
					</ThemeProvider>
				</QueryClientProvider>

				<Scripts />
			</body>
		</html>
	);
}

function NotFound() {
	return (
		<Empty className="h-full">
			<EmptyHeader>
				<EmptyTitle>404: Not found</EmptyTitle>
				<EmptyDescription>The page you're looking for does not exist.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button variant="ghost" render={<Link to="/" />}>
					Go home
				</Button>
			</EmptyContent>
		</Empty>
	);
}
