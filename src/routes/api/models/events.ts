import { createFileRoute } from "@tanstack/react-router";
import { getModelEvents } from "#/features/library/server/model-events.server";
import { authedRequest } from "#/lib/middleware";

export const Route = createFileRoute("/api/models/events")({
	server: {
		middleware: [authedRequest],
		handlers: {
			GET: ({ request, context: { userId } }) => getModelEvents({ request, userId }),
		},
	},
});
