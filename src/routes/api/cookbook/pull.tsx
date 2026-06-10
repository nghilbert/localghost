import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";

async function getOllamaUrl(userId: string): Promise<string> {
	const ep = await prisma.modelEndpoint.findFirst({
		where: { ownerId: userId, provider: "ollama" },
		orderBy: { createdAt: "asc" },
	});
	return (ep?.url ?? "http://localhost:11434").replace(/\/+$/, "");
}

export const Route = createFileRoute("/api/cookbook/pull")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				const body = (await request.json()) as { model?: string; ollamaUrl?: string };
				if (!body.model?.trim()) return new Response("model is required", { status: 400 });

				const ollamaUrl =
					body.ollamaUrl?.replace(/\/+$/, "") ?? (await getOllamaUrl(session.user.id));

				const ollamaRes = await fetch(`${ollamaUrl}/api/pull`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name: body.model, stream: true }),
				}).catch((err: Error) => {
					throw new Error(`Cannot reach Ollama at ${ollamaUrl}: ${err.message}`);
				});

				if (!ollamaRes.ok || !ollamaRes.body) {
					return new Response(`Ollama error: ${ollamaRes.statusText}`, {
						status: ollamaRes.status,
					});
				}

				const enc = new TextEncoder();
				const ollamaReader = ollamaRes.body.getReader();

				const readable = new ReadableStream({
					async start(controller) {
						const send = (data: Record<string, unknown>) =>
							controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

						const dec = new TextDecoder();
						let buf = "";

						try {
							while (true) {
								const { done, value } = await ollamaReader.read();
								if (done) break;
								buf += dec.decode(value, { stream: true });
								const lines = buf.split("\n");
								buf = lines.pop() ?? "";
								for (const line of lines) {
									if (!line.trim()) continue;
									try {
										const chunk = JSON.parse(line) as {
											status?: string;
											digest?: string;
											total?: number;
											completed?: number;
											error?: string;
										};
										if (chunk.error) {
											send({ type: "error", error: chunk.error });
										} else if (chunk.status === "success") {
											send({ type: "done" });
										} else {
											send({
												type: "progress",
												status: chunk.status,
												digest: chunk.digest,
												total: chunk.total,
												completed: chunk.completed,
											});
										}
									} catch {
										// skip malformed NDJSON lines
									}
								}
							}
						} catch (err) {
							send({ type: "error", error: (err as Error).message });
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
