import { createFileRoute } from "@tanstack/react-router";
import { getChatStream, postChatStream } from "#/features/chat/server/stream.server";
import { authedRequest } from "#/lib/middleware";

export const Route = createFileRoute("/api/chat/stream")({
	server: {
		middleware: [authedRequest],
		handlers: {
			POST: ({ request, context: { userId } }) => postChatStream({ request, userId }),
			GET: ({ request, context: { userId } }) => getChatStream({ request, userId }),
		},
	},
});
