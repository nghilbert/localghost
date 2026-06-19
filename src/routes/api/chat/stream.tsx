import "#/lib/startup.server";
import {
	chatParamsFromRequestBody,
	convertMessagesToModelMessages,
	type ModelMessage,
	type StreamChunk,
	toServerSentEventsResponse,
} from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { chatStreamForwardedPropsSchema } from "#/features/chat/lib/schemas";
import { runAgentEvents } from "#/lib/agent.server";
import { maybeCompact } from "#/lib/compactor.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { streamLLMEvents } from "#/lib/llm.server";
import { listAllMcpTools } from "#/lib/mcp.server";
import { fireWebhook } from "#/lib/webhook.server";

const MAX_HISTORY_MESSAGES = 40;

/** Caps history to the most recent N turns before compaction. */
function trimHistory(messages: ModelMessage[]): ModelMessage[] {
	if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
	return messages.slice(-MAX_HISTORY_MESSAGES);
}

/**
 * Pure chat stream: the client owns persistence (it hydrates from and writes to
 * the `Conversation.messages` blob via the persistence adapter), so this route
 * performs no database writes. It reads the conversation's config + endpoint,
 * builds the model message list from the request body, compacts, dispatches to
 * the LLM or agent runner, and forwards the AG-UI event stream back.
 */
export const Route = createFileRoute("/api/chat/stream")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });
				const userId = session.user.id;

				const params = await chatParamsFromRequestBody(await request.json());
				const forwarded = chatStreamForwardedPropsSchema.safeParse(params.forwardedProps);
				if (!forwarded.success) return new Response("Bad request", { status: 400 });
				const conversationId = forwarded.data.conversationId;

				const conversation = await prisma.conversation.findFirst({
					where: { id: conversationId, ownerId: userId },
					include: { endpoint: true },
				});
				if (!conversation) return new Response("Conversation not found", { status: 404 });
				if (!conversation.endpoint) {
					return new Response("No model endpoint configured", { status: 400 });
				}

				const endpoint = conversation.endpoint;
				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
				const isAgent = conversation.mode === "agent";

				// System prompt + temperature are global per-user chat defaults.
				const userSettings = await prisma.userSettings.findUnique({
					where: { ownerId: userId },
				});
				const temperature = userSettings?.temperature ?? undefined;

				const modelMessages = convertMessagesToModelMessages(params.messages);

				// Build effective system prompt: the user's global prompt plus their skills.
				let systemPrompt = userSettings?.systemPrompt ?? undefined;
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
					systemPrompt = systemPrompt ? `${systemPrompt}\n\n${skillBlock}` : skillBlock;
				}

				// Auto-compact when approaching the model's context-window limit.
				const { messages: compactedHistory, systemPrompt: effectiveSystemPrompt } =
					await maybeCompact(
						trimHistory(modelMessages),
						systemPrompt,
						conversation.model,
						endpoint.url,
						apiKey,
					);

				// Enumerate enabled MCP server tools for agent mode.
				const mcpTools = isAgent
					? await (async () => {
							const servers = await prisma.mcpServer.findMany({
								where: { ownerId: userId, enabled: true },
							});
							return servers.length > 0 ? listAllMcpTools(servers) : [];
						})()
					: [];

				const source = isAgent
					? runAgentEvents({
							url: endpoint.url,
							apiKey,
							model: conversation.model,
							messages: compactedHistory,
							systemPrompt: effectiveSystemPrompt,
							ownerId: userId,
							mcpTools,
						})
					: streamLLMEvents({
							url: endpoint.url,
							apiKey,
							model: conversation.model,
							messages: compactedHistory,
							systemPrompt: effectiveSystemPrompt,
							temperature,
						});

				// Forward the event stream, firing the completion webhook on RUN_FINISHED
				// and translating provider errors into a terminal RUN_ERROR event.
				async function* withSideEffects(): AsyncGenerator<StreamChunk> {
					try {
						for await (const chunk of source) {
							if (chunk.type === "RUN_FINISHED") {
								fireWebhook("chat.completed", { conversationId }, userId).catch(() => {});
							}
							yield chunk;
						}
					} catch (err) {
						yield {
							type: EventType.RUN_ERROR,
							message: err instanceof Error ? err.message : "LLM request failed",
						};
					}
				}

				return toServerSentEventsResponse(withSideEffects());
			},
		},
	},
});
