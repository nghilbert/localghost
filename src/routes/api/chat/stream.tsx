import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { type LLMMessage, streamLLM } from "#/lib/llm.server";

export const Route = createFileRoute("/api/chat/stream")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				// Auth
				const headers = request.headers;
				const session = await auth.api.getSession({ headers });
				if (!session) {
					return new Response("Unauthorized", { status: 401 });
				}
				const userId = session.user.id;

				const body = (await request.json()) as {
					sessionId: string;
					message: string;
				};

				if (!body.sessionId || !body.message?.trim()) {
					return new Response("Bad request", { status: 400 });
				}

				// Load session + endpoint
				const chatSession = await prisma.chatSession.findFirst({
					where: { id: body.sessionId, ownerId: userId },
					include: { endpoint: true, messages: { orderBy: { createdAt: "asc" } } },
				});
				if (!chatSession) {
					return new Response("Session not found", { status: 404 });
				}
				if (!chatSession.endpoint) {
					return new Response("No model endpoint configured for this session", { status: 400 });
				}

				// Persist user message
				const userMsg = await prisma.chatMessage.create({
					data: { sessionId: chatSession.id, role: "user", content: body.message },
				});

				// Build message history for LLM
				const history: LLMMessage[] = chatSession.messages.map((m) => ({
					role: m.role as LLMMessage["role"],
					content: m.content,
				}));
				history.push({ role: "user", content: body.message });

				const endpoint = chatSession.endpoint;
				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;

				// SSE stream
				let assistantText = "";
				const encoder = new TextEncoder();

				const readable = new ReadableStream({
					async start(controller) {
						const send = (data: Record<string, unknown>) => {
							controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
						};
						try {
							const llmStream = await streamLLM({
								url: endpoint.url,
								apiKey,
								model: chatSession.model,
								messages: history,
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
								} else if (value.type === "tool_calls") {
									send({ type: "tool_calls", calls: value.calls });
								} else if (value.type === "done") {
									send({ type: "done" });
								} else if (value.type === "error") {
									send({ type: "error", error: value.error });
								}
							}
						} catch (err) {
							send({ type: "error", error: err instanceof Error ? err.message : "Unknown error" });
						} finally {
							// Persist assistant reply
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
								// Even if empty reply, update access time and save user message count
								await prisma.chatSession.update({
									where: { id: chatSession.id },
									data: { messageCount: { increment: 1 }, lastAccessedAt: new Date() },
								});
							}
							// Mark user message in count (already handled above, just close)
							controller.close();
						}
					},
					cancel() {
						// Client disconnected — we still persist what we have via the finally block
					},
				});

				// Suppress unused variable warning — userMsg is used for DB side-effect
				void userMsg;

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
