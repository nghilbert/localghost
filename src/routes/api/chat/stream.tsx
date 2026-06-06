import "#/lib/startup.server";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { runAgent } from "#/lib/agent.server";
import { maybeCompact } from "#/lib/compactor.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { embed, toVectorLiteral } from "#/lib/embeddings.server";
import { callLLM, type LLMMessage, streamLLM } from "#/lib/llm.server";
import { fireWebhook } from "#/lib/webhook.server";

const MAX_HISTORY_MESSAGES = 40;

async function ragContext(message: string, userId: string): Promise<string | null> {
	try {
		const embedding = await embed(message, userId);
		if (!embedding) return null;
		const literal = toVectorLiteral(embedding);
		const rows = await prisma.$queryRawUnsafe<{ title: string; content: string; score: number }[]>(
			`SELECT title, content, 1 - (embedding <=> $1::vector) AS score
			 FROM "Document"
			 WHERE "ownerId" = $2 AND archived = false AND embedding IS NOT NULL
			 ORDER BY score DESC LIMIT 3`,
			literal,
			userId,
		);
		const relevant = rows.filter((r) => r.score > 0.5);
		if (!relevant.length) return null;
		return relevant.map((r) => `### ${r.title}\n${r.content.slice(0, 1500)}`).join("\n\n---\n\n");
	} catch {
		return null;
	}
}

function trimHistory(messages: LLMMessage[]): LLMMessage[] {
	if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
	// Keep system messages + the most recent N exchanges
	const system = messages.filter((m) => m.role === "system");
	const nonSystem = messages.filter((m) => m.role !== "system");
	const trimmed = nonSystem.slice(-MAX_HISTORY_MESSAGES);
	return [...system, ...trimmed];
}

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
				const temperature = chatSession.temperature ?? undefined;

				// Build effective system prompt, injecting RAG context if enabled
				let effectiveSystemPrompt = chatSession.systemPrompt ?? undefined;
				if (chatSession.ragEnabled) {
					const ctx = await ragContext(body.message, userId);
					if (ctx) {
						const ragBlock = `Relevant document context:\n\n${ctx}`;
						effectiveSystemPrompt = effectiveSystemPrompt
							? `${effectiveSystemPrompt}\n\n${ragBlock}`
							: ragBlock;
					}
				}

				// Auto-compact when approaching context window limit
				const { messages: compactedHistory } = await maybeCompact(
					trimHistory(history),
					chatSession.model,
					endpoint.url,
					apiKey,
				);
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
									messages: compactedHistory,
									systemPrompt: effectiveSystemPrompt,
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
									messages: compactedHistory,
									systemPrompt: effectiveSystemPrompt,
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

								// Auto-name session after first exchange
								const isFirstExchange =
									chatSession.messageCount === 0 && chatSession.name === "New Chat";
								let newName: string | undefined;
								if (isFirstExchange) {
									try {
										newName = await callLLM({
											url: endpoint.url,
											apiKey,
											model: chatSession.model,
											messages: [
												{
													role: "user",
													content: `Summarize this conversation in 4-6 words as a chat title. No quotes, no punctuation at the end.\n\nUser: ${body.message.slice(0, 500)}\nAssistant: ${assistantText.slice(0, 500)}`,
												},
											],
											temperature: 0.3,
											maxTokens: 20,
										});
										newName = newName
											?.replace(/["'.!?]+$/, "")
											.trim()
											.slice(0, 80);
									} catch {
										newName = body.message.split(/\s+/).slice(0, 5).join(" ");
									}
									if (newName) send({ type: "session_name", name: newName });
								}

								await prisma.chatSession.update({
									where: { id: chatSession.id },
									data: {
										messageCount: { increment: 2 },
										lastMessageAt: new Date(),
										lastAccessedAt: new Date(),
										...(newName ? { name: newName } : {}),
									},
								});

								// Fire outgoing webhooks (non-blocking)
								fireWebhook(
									"chat.completed",
									{ sessionId: chatSession.id, messageCount: chatSession.messageCount + 2 },
									userId,
								).catch(() => {});
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
