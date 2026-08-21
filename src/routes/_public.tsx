import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Container } from "#/shared/components/ui/container";
import { APP_NAME } from "#/shared/lib/constants";

export const Route = createFileRoute("/_public")({
	beforeLoad: ({ context }) => {
		if (context.auth) throw redirect({ to: "/" });
	},
	component: () => (
		<div className="flex h-dvh flex-col items-center justify-center gap-8 px-4">
			<header className="text-center">
				<h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
				<p className="mt-1 text-sm text-muted-foreground">Your self-hosted AI workspace</p>
			</header>
			{/* The active public page (sign-in/sign-up) renders into this <main /> */}
			<Container size="sm" render={<main />}>
				<Outlet />
			</Container>
		</div>
	),
});
