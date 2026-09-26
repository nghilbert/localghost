import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
	// A conversation is created only when its first message is sent.
	loader: () => {
		throw redirect({ to: "/new" });
	},
});
