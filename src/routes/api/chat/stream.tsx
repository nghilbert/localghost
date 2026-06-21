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
import { buildChatTools } from "#/features/chat/lib/agent.server";
import { maybeCompact } from "#/features/chat/lib/compactor.server";
import { chatStreamForwardedPropsSchema } from "#/features/chat/lib/schemas";
import { listAllMcpTools } from "#/features/mcp/lib/tools.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { streamLLMEvents } from "#/lib/llm.server";
import { MCP_TOOL_PREFIX } from "#/lib/tools/catalog";

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
				const { conversationId, enabledTools } = forwarded.data;

				const conversation = await prisma.conversation.findFirst({
					where: { id: conversationId, ownerId: userId },
					include: { endpoint: true },
				});
				if (!conversation) return new Response("Conversation not found", { status: 404 });
				if (!conversation.endpoint)
					return new Response("No model endpoint configured", { status: 400 });

				const endpoint = conversation.endpoint;
				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;

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

				// Tools are entirely opt-in per send: the user's catalog selection (web
				// search, memory, search chats, skills) plus any toggled MCP servers. MCP
				// servers are only enumerated when the user actually toggled one this send.
				const wantsMcp = enabledTools.some((id) => id.startsWith(MCP_TOOL_PREFIX));
				const mcpServers = wantsMcp
					? await prisma.mcpServer.findMany({ where: { ownerId: userId, enabled: true } })
					: [];
				const mcpTools = await listAllMcpTools(
					mcpServers.map((s) => ({ id: s.id, name: s.name, url: s.url, type: s.type })),
				);
				const tools = buildChatTools({
					ownerId: userId,
					conversationId,
					enabledTools,
					mcpTools,
				});

				// Auto-compact when approaching the model's context-window limit.
				const { messages: compactedHistory, systemPrompt: effectiveSystemPrompt } =
					await maybeCompact(
						trimHistory(modelMessages),
						systemPrompt,
						conversation.model,
						endpoint.url,
						apiKey,
					);

				const source = streamLLMEvents(
					{
						url: endpoint.url,
						apiKey,
						model: conversation.model,
						messages: compactedHistory,
						systemPrompt: effectiveSystemPrompt,
						temperature,
					},
					tools,
				);

				// Translate provider errors into a terminal RUN_ERROR event.
				async function* withErrorHandling(): AsyncGenerator<StreamChunk> {
					try {
						for await (const chunk of source) {
							yield chunk;
						}
					} catch (err) {
						yield {
							type: EventType.RUN_ERROR,
							message: err instanceof Error ? err.message : "LLM request failed",
						};
					}
				}

				return toServerSentEventsResponse(withErrorHandling());
			},
		},
	},
});
