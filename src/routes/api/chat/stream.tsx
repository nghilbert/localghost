import "#/lib/startup.server";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { runAgent } from "#/lib/agent.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { type LLMMessage, streamLLM } from "#/lib/llm.server";

export const Route = createFileRoute("/api/chat/stream")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const headers = request.headers;
				const session = await auth.api.getSession({ headers });
				if (!session) return new Response("Unauthorized", { status: 401 });
				const userId = session.user.id;

				const body = (await request.json()) as { sessionId: string; message: string };
				if (!body.sessionId || !body.message?.trim()) {
					return new Response("Bad request", { status: 400 });
				}

				const chatSession = await prisma.chatSession.findFirst({
					where: { id: body.sessionId, ownerId: userId },
					include: { endpoint: true, messages: { orderBy: { createdAt: "asc" } } },
				});
				if (!chatSession) return new Response("Session not found", { status: 404 });
				if (!chatSession.endpoint) {
					return new Response("No model endpoint configured", { status: 400 });
				}

				await prisma.chatMessage.create({
					data: { sessionId: chatSession.id, role: "user", content: body.message },
				});

				const history: LLMMessage[] = chatSession.messages.map((m) => ({
					role: m.role as LLMMessage["role"],
					content: m.content,
				}));
				history.push({ role: "user", content: body.message });

				const endpoint = chatSession.endpoint;
				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
				const isAgent = chatSession.mode === "agent";
				const systemPrompt = chatSession.systemPrompt ?? undefined;
				const temperature = chatSession.temperature ?? undefined;

				let assistantText = "";
				const encoder = new TextEncoder();

				const readable = new ReadableStream({
					async start(controller) {
						const send = (data: Record<string, unknown>) =>
							controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

						try {
							if (isAgent) {
								for await (const chunk of runAgent({
									url: endpoint.url,
									apiKey,
									model: chatSession.model,
									messages: history,
									systemPrompt,
									ownerId: userId,
								})) {
									if (chunk.type === "delta") {
										assistantText += chunk.delta;
										send({ type: "delta", delta: chunk.delta });
									} else if (chunk.type === "tool_result") {
										send({ type: "tool_result", tool: chunk.tool, result: chunk.result });
									} else if (chunk.type === "thinking") {
										send({ type: "thinking", delta: chunk.delta });
									} else if (chunk.type === "usage") {
										send({
											type: "usage",
											input_tokens: chunk.input_tokens,
											output_tokens: chunk.output_tokens,
										});
									} else if (chunk.type === "done") {
										send({ type: "done" });
									} else if (chunk.type === "error") {
										send({ type: "error", error: chunk.error });
									}
								}
							} else {
								const llmStream = await streamLLM({
									url: endpoint.url,
									apiKey,
									model: chatSession.model,
									messages: history,
									systemPrompt,
									temperature,
								});
								const reader = llmStream.getReader();
								while (true) {
									const { done, value } = await reader.read();
									if (done) break;
									if (value.type === "delta") {
										assistantText += value.delta;
										send({ type: "delta", delta: value.delta });
									} else if (value.type === "thinking") {
										send({ type: "thinking", delta: value.delta });
									} else if (value.type === "usage") {
										send({
											type: "usage",
											input_tokens: value.input_tokens,
											output_tokens: value.output_tokens,
										});
									} else if (value.type === "done") {
										send({ type: "done" });
									} else if (value.type === "error") {
										send({ type: "error", error: value.error });
									}
								}
							}
						} catch (err) {
							send({ type: "error", error: err instanceof Error ? err.message : "Unknown error" });
						} finally {
							if (assistantText) {
								await prisma.chatMessage.create({
									data: { sessionId: chatSession.id, role: "assistant", content: assistantText },
								});
								await prisma.chatSession.update({
									where: { id: chatSession.id },
									data: {
										messageCount: { increment: 2 },
										lastMessageAt: new Date(),
										lastAccessedAt: new Date(),
									},
								});
							} else {
								await prisma.chatSession.update({
									where: { id: chatSession.id },
									data: { messageCount: { increment: 1 }, lastAccessedAt: new Date() },
								});
							}
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
