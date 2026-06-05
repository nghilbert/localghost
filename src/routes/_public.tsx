import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_public")({
	beforeLoad: ({ context }) => {
		if (context.auth) throw redirect({ to: "/" });
	},
	component: () => (
		<div className="flex container m-auto justify-center">
			<Outlet />
		</div>
	),
});
