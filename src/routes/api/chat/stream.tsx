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
import { buildChatTools } from "#/lib/agent.server";
import { maybeCompact } from "#/lib/compactor.server";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { streamLLMEvents } from "#/lib/llm.server";
import { listAllMcpTools } from "#/lib/mcp.server";
import { MCP_TOOL_PREFIX } from "#/lib/tools/catalog";
import { recallMemories } from "#/lib/tools/manage_memory";

const MAX_HISTORY_MESSAGES = 40;
const MEMORY_RECALL_LIMIT = 5;

/** Caps history to the most recent N turns before compaction. */
function trimHistory(messages: ModelMessage[]): ModelMessage[] {
	if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
	return messages.slice(-MAX_HISTORY_MESSAGES);
}

/** The text of the most recent user message — the query for automatic memory recall. */
function latestUserText(messages: ModelMessage[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (message?.role !== "user") continue;
		const { content } = message;
		if (typeof content === "string") return content;
		if (Array.isArray(content)) {
			return content.flatMap((part) => (part.type === "text" ? [part.content] : [])).join(" ");
		}
		return "";
	}
	return "";
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
				const memoryEnabled = userSettings?.memoryEnabled ?? true;

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

				// Automatic memory: recall the most relevant memories for this turn and
				// inject them so the model has long-term context without an explicit tool call.
				if (memoryEnabled) {
					const recalled = await recallMemories(
						userId,
						latestUserText(modelMessages),
						MEMORY_RECALL_LIMIT,
					);
					if (recalled.length > 0) {
						const memoryBlock =
							"## Remembered about the user\n" +
							recalled.map((m) => `- (${m.category}) ${m.text}`).join("\n");
						systemPrompt = systemPrompt ? `${systemPrompt}\n\n${memoryBlock}` : memoryBlock;
					}
				}

				// Tools: always-on (search_chats, manage_skills, manage_memory unless
				// opted out) plus the user's ephemeral per-send selection. MCP servers are
				// only enumerated when the user actually toggled one this send.
				const wantsMcp = enabledTools.some((id) => id.startsWith(MCP_TOOL_PREFIX));
				const mcpServers = wantsMcp
					? await prisma.mcpServer.findMany({ where: { ownerId: userId, enabled: true } })
					: [];
				const mcpTools = await listAllMcpTools(
					mcpServers.map((s) => ({ id: s.id, name: s.name, url: s.url, type: s.type })),
				);
				const tools = buildChatTools({ ownerId: userId, enabledTools, mcpTools, memoryEnabled });

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
