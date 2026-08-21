import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/shared/lib/auth.server";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }) => await auth.handler(request),
			POST: async ({ request }) => await auth.handler(request),
		},
	},
});
