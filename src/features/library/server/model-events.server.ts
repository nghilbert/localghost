import { modelEventsQuerySchema } from "#/features/library/library.schemas";
import { openModelEventStream } from "#/lib/llamacpp/client.server";
import { getRuntimeEndpointById } from "./discovery.server";

/** Relays llama.cpp's model events (download progress, loads) for a runtime the user owns. */
export async function getModelEvents({
	request,
	userId,
}: {
	request: Request;
	userId: string;
}): Promise<Response> {
	const query = modelEventsQuerySchema.safeParse(
		Object.fromEntries(new URL(request.url).searchParams),
	);
	if (!query.success) return new Response("Invalid endpoint id", { status: 400 });

	let endpoint: Awaited<ReturnType<typeof getRuntimeEndpointById>>;
	try {
		endpoint = await getRuntimeEndpointById({ userId, endpointId: query.data.endpointId });
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
}
