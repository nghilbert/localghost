import "#/lib/globals.css";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { TooltipProvider } from "#/components/ui/tooltip";
import { authQueryOptions } from "#/features/auth/lib/auth.functions";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
	beforeLoad: async ({ context }) => {
		const auth = await context.queryClient.ensureQueryData(authQueryOptions());
		return { auth };
	},
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
	}),
});

function RootDocument() {
	const { queryClient } = Route.useRouteContext();

	return (
		<html lang="en">
			<head>
				<HeadContent />
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			</head>

			<body className="min-h-dvh flex flex-col">
				<QueryClientProvider client={queryClient}>
					<TooltipProvider>
						<Outlet />
					</TooltipProvider>
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
