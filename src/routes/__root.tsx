import "#/lib/globals.css";
import { TanStackDevtools } from "@tanstack/react-devtools";
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
import { useEffect } from "react";
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
import { ThemeProvider } from "#/features/theme/ThemeProvider";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
	beforeLoad: async () => ({ auth: await getAuthSession() }),
	component: RootDocument,
	notFoundComponent: NotFound,
	head: () => ({
		meta: [
			{ title: "Pretty Odysseus" },
			{ name: "description", content: "Self-hosted AI workspace" },
		],
		links: [
			{ rel: "icon", href: "/favicon.ico" },
			{ rel: "manifest", href: "/manifest.json" },
		],
		scripts: [
			{
				// Apply dark mode + accent theme before first paint to avoid a flash
				// of the wrong scheme; mirrors ThemeProvider's storage keys.
				children: `(function(){try{var m=localStorage.getItem("odysseus-mode");var d=m==="dark"||(m!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");var t=localStorage.getItem("odysseus-theme");if(t&&t!=="default")document.documentElement.classList.add("theme-"+t);}catch(e){}})();`,
			},
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
					<ThemeProvider>
						<TooltipProvider>
							<Outlet />
							<Toaster richColors position="bottom-right" />
							<TanStackDevtools
								plugins={[
									{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
									{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
								]}
							/>
						</TooltipProvider>
					</ThemeProvider>
				</QueryClientProvider>

				<Scripts />
				<ServiceWorkerRegistrar />
			</body>
		</html>
	);
}

function ServiceWorkerRegistrar() {
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.register("/sw.js").catch(() => {});
		}
	}, []);
	return null;
}

function NotFound() {
	return (
		<Empty className="min-h-dvh">
			<EmptyHeader>
				<EmptyTitle>404: Not found</EmptyTitle>
				<EmptyDescription>The page you're looking for does not exist.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button variant="ghost" asChild>
					<Link to="/">Go home</Link>
				</Button>
			</EmptyContent>
		</Empty>
	);
}
