import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
	// Landing creates no conversation row; it sends the user to `/new`, where the
	// row is created only once they send their first message.
	loader: () => {
		throw redirect({ to: "/new" });
	},
});
