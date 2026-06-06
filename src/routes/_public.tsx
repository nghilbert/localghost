import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { APP_NAME } from "#/lib/constants";

export const Route = createFileRoute("/_public")({
	beforeLoad: ({ context }) => {
		if (context.auth) throw redirect({ to: "/" });
	},
	component: () => (
		<div className="flex h-dvh flex-col items-center justify-center gap-8 px-4">
			<div className="text-center">
				<h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
				<p className="mt-1 text-sm text-muted-foreground">Your self-hosted AI workspace</p>
			</div>
			<Outlet />
		</div>
	),
});
