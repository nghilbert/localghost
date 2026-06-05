import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { runResearch } from "#/lib/research.server";

export const Route = createFileRoute("/api/research/stream")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				const body = (await request.json()) as { question: string; endpointId?: string };
				if (!body.question?.trim()) return new Response("Bad request", { status: 400 });

				// Resolve endpoint + model: prefer an explicit endpointId+model, else
				// fall back to the user's most recently active chat session config.
				const bodyTyped = body as { question: string; endpointId?: string; model?: string };

				const endpoint = bodyTyped.endpointId
					? await prisma.modelEndpoint.findFirst({
							where: { id: bodyTyped.endpointId, ownerId: session.user.id },
						})
					: await prisma.modelEndpoint.findFirst({
							where: { ownerId: session.user.id },
							orderBy: { updatedAt: "desc" },
						});

				if (!endpoint) return new Response("No endpoint configured", { status: 400 });

				// Use provided model or fall back to the last session's model for this endpoint
				let model = bodyTyped.model ?? "";
				if (!model) {
					const lastSession = await prisma.chatSession.findFirst({
						where: { endpointId: endpoint.id, ownerId: session.user.id },
						orderBy: { lastAccessedAt: "desc" },
					});
					model = lastSession?.model ?? "gpt-4o";
				}

				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
				const encoder = new TextEncoder();

				const readable = new ReadableStream({
					async start(controller) {
						const send = (data: Record<string, unknown>) =>
							controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

						try {
							for await (const chunk of runResearch({
								url: endpoint.url,
								apiKey,
								model,
								question: body.question,
							})) {
								if (chunk.type === "progress") {
									send({ type: "progress", message: chunk.message });
								} else if (chunk.type === "report") {
									send({ type: "report", content: chunk.content });
								} else if (chunk.type === "done") {
									send({ type: "done" });
								} else if (chunk.type === "error") {
									send({ type: "error", error: chunk.error });
								}
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
