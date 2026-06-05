import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { type LLMMessage, streamLLM } from "#/lib/llm.server";

export const Route = createFileRoute("/api/compare/stream")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				const body = (await request.json()) as {
					prompt: string;
					endpointId: string;
					model: string;
				};

				if (!body.prompt?.trim() || !body.endpointId || !body.model) {
					return new Response("Bad request", { status: 400 });
				}

				const endpoint = await prisma.modelEndpoint.findFirst({
					where: { id: body.endpointId, ownerId: session.user.id },
				});
				if (!endpoint) return new Response("Endpoint not found", { status: 404 });

				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
				const messages: LLMMessage[] = [{ role: "user", content: body.prompt }];

				const encoder = new TextEncoder();
				const readable = new ReadableStream({
					async start(controller) {
						const send = (data: Record<string, unknown>) =>
							controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

						try {
							const llmStream = await streamLLM({
								url: endpoint.url,
								apiKey,
								model: body.model,
								messages,
							});
							const reader = llmStream.getReader();
							while (true) {
								const { done, value } = await reader.read();
								if (done) break;
								send(value);
							}
						} catch (err) {
							send({ type: "error", error: err instanceof Error ? err.message : "Unknown error" });
						} finally {
							controller.close();
						}
					},
				});

				return new Response(readable, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
						"X-Accel-Buffering": "no",
					},
				});
			},
		},
	},
});
