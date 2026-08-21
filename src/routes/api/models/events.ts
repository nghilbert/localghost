import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeEndpointById } from "#/shared/domain/model/discovery.server";
import { modelEventsQuerySchema } from "#/shared/domain/model/schemas";
import { openModelEventStream } from "#/shared/lib/llamacpp/client.server";
import { authedRequest } from "#/shared/lib/middleware";

export const Route = createFileRoute("/api/models/events")({
	server: {
		middleware: [authedRequest],
		handlers: {
			GET: async ({ request, context: { userId } }) => {
				const query = modelEventsQuerySchema.safeParse(
					Object.fromEntries(new URL(request.url).searchParams),
				);
				if (!query.success) return new Response("Invalid endpoint id", { status: 400 });

				let endpoint: Awaited<ReturnType<typeof getRuntimeEndpointById>>;
				try {
					endpoint = await getRuntimeEndpointById({
						userId,
						endpointId: query.data.endpointId,
					});
				} catch {
					return new Response("llama.cpp endpoint not found", { status: 404 });
				}

				try {
					const body = await openModelEventStream({
						url: endpoint.url,
						apiKey: endpoint.apiKey,
						signal: request.signal,
					});
					return new Response(body, {
						headers: {
							"Cache-Control": "no-cache, no-transform",
							"Content-Type": "text/event-stream",
							"X-Accel-Buffering": "no",
						},
					});
				} catch (error) {
					console.error("Failed to open the llama.cpp model-event stream", { error });
					return new Response("Unable to connect to llama.cpp model events", { status: 502 });
				}
			},
		},
	},
});
