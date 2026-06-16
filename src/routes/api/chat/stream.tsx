import "#/lib/startup.server";
import { type StreamChunk, toServerSentEventsResponse } from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { chatStreamRequestSchema } from "#/features/chat/lib/schemas";
import { runAgentEvents } from "#/lib/agent.server";
import { maybeCompact } from "#/lib/compactor.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { callLLM, type LLMMessage, streamLLMEvents } from "#/lib/llm.server";
import { listAllMcpTools } from "#/lib/mcp.server";
import { fireWebhook } from "#/lib/webhook.server";

const MAX_HISTORY_MESSAGES = 40;

// Persisted chat roles are user/assistant/system; coerce any unexpected stored
// value to "user" so a stray row can't break the LLM message mapping.
const chatRoleSchema = z.enum(["system", "user", "assistant"]).catch("user");

function trimHistory(messages: LLMMessage[]): LLMMessage[] {
	if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
	// Keep system messages + the most recent N exchanges
	const system = messages.filter((m) => m.role === "system");
	const nonSystem = messages.filter((m) => m.role !== "system");
	const trimmed = nonSystem.slice(-MAX_HISTORY_MESSAGES);
	return [...system, ...trimmed];
}

/** Flattens an AG-UI wire message's content (string or content parts) to plain text. */
function wireContentToText(content: string | Array<{ type: string; content?: string }>): string {
	if (typeof content === "string") return content;
	return content
		.filter((part) => part.type === "text" && typeof part.content === "string")
		.map((part) => part.content ?? "")
		.join("");
}

export const Route = createFileRoute("/api/chat/stream")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const headers = request.headers;
				const session = await auth.api.getSession({ headers });
				if (!session) return new Response("Unauthorized", { status: 401 });
				const userId = session.user.id;

				const parsed = chatStreamRequestSchema.safeParse(await request.json());
				if (!parsed.success) return new Response("Bad request", { status: 400 });

				const sessionId = parsed.data.forwardedProps.sessionId;
				const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user");
				const message = lastUser ? wireContentToText(lastUser.content).trim() : "";
				if (!message) return new Response("Bad request", { status: 400 });

				const chatSession = await prisma.chatSession.findFirst({
					where: { id: sessionId, ownerId: userId },
					include: { endpoint: true, messages: { orderBy: { createdAt: "asc" } } },
				});
				if (!chatSession) return new Response("Session not found", { status: 404 });
				if (!chatSession.endpoint) {
					return new Response("No model endpoint configured", { status: 400 });
				}

				await prisma.chatMessage.create({
					data: { sessionId: chatSession.id, role: "user", content: message },
				});

				const history: LLMMessage[] = chatSession.messages.map((m) => ({
					role: chatRoleSchema.parse(m.role),
					content: m.content,
				}));
				history.push({ role: "user", content: message });

				const endpoint = chatSession.endpoint;
				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
				const isAgent = chatSession.mode === "agent";
				const temperature = chatSession.temperature ?? undefined;

				// Build effective system prompt, injecting skills if available
				let effectiveSystemPrompt = chatSession.systemPrompt ?? undefined;

				// Inject user skills into system prompt
				const userSkills = await prisma.skill.findMany({
					where: { ownerId: userId },
					orderBy: { updatedAt: "desc" },
					take: 5,
				});
				if (userSkills.length > 0) {
					const skillBlock =
						"## Your Skills\n" +
						userSkills
							.map((s) => `### ${s.name}${s.description ? `\n${s.description}` : ""}\n${s.content}`)
							.join("\n\n");
					effectiveSystemPrompt = effectiveSystemPrompt
						? `${effectiveSystemPrompt}\n\n${skillBlock}`
						: skillBlock;
				}

				// Auto-compact when approaching context window limit
				const { messages: compactedHistory } = await maybeCompact(
					trimHistory(history),
					chatSession.model,
					endpoint.url,
					apiKey,
				);

				// Enumerate enabled MCP server tools for agent mode
				const mcpTools = isAgent
					? await (async () => {
							const servers = await prisma.mcpServer.findMany({
								where: { ownerId: userId, enabled: true },
							});
							return servers.length > 0 ? listAllMcpTools(servers) : [];
						})()
					: [];

				let assistantText = "";
				let finalized = false;

				/**
				 * Persists the assistant turn and runs the once-per-run side effects
				 * (auto-name, counters, webhook). Invoked when `RUN_FINISHED` arrives —
				 * before that event is forwarded, so the client's onFinish refetch sees
				 * the persisted name — and again from `finally` to cover early aborts.
				 */
				const finalize = async () => {
					if (finalized) return;
					finalized = true;

					if (!assistantText) {
						await prisma.chatSession.update({
							where: { id: chatSession.id },
							data: { messageCount: { increment: 1 }, lastAccessedAt: new Date() },
						});
						return;
					}

					await prisma.chatMessage.create({
						data: { sessionId: chatSession.id, role: "assistant", content: assistantText },
					});

					// Auto-name session after first exchange
					const isFirstExchange = chatSession.messageCount === 0 && chatSession.name === "New Chat";
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
										content: `Summarize this conversation in 4-6 words as a chat title. No quotes, no punctuation at the end.\n\nUser: ${message.slice(0, 500)}\nAssistant: ${assistantText.slice(0, 500)}`,
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
							newName = message.split(/\s+/).slice(0, 5).join(" ");
						}
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
				};

				const source = isAgent
					? runAgentEvents({
							url: endpoint.url,
							apiKey,
							model: chatSession.model,
							messages: compactedHistory,
							systemPrompt: effectiveSystemPrompt,
							ownerId: userId,
							mcpTools,
						})
					: streamLLMEvents({
							url: endpoint.url,
							apiKey,
							model: chatSession.model,
							messages: compactedHistory,
							systemPrompt: effectiveSystemPrompt,
							temperature,
						});

				// Wrap the raw @tanstack/ai event stream: accumulate the assistant text for
				// persistence and run the side effects before the terminal RUN_FINISHED is
				// forwarded, translating thrown provider errors into a RUN_ERROR event.
				async function* withSideEffects(): AsyncGenerator<StreamChunk> {
					try {
						for await (const chunk of source) {
							if (chunk.type === "TEXT_MESSAGE_CONTENT") assistantText += chunk.delta;
							if (chunk.type === "RUN_FINISHED") {
								await finalize();
								yield chunk;
								return;
							}
							yield chunk;
						}
					} catch (err) {
						yield {
							type: EventType.RUN_ERROR,
							message: err instanceof Error ? err.message : "LLM request failed",
						};
					} finally {
						await finalize();
					}
				}

				return toServerSentEventsResponse(withSideEffects());
			},
		},
	},
});
