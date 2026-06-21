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
import { resolveChatTools } from "#/features/chat/lib/agent.server";
import { buildSystemPrompt } from "#/features/chat/lib/prompt.server";
import { chatStreamForwardedPropsSchema } from "#/features/chat/lib/schemas";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { streamLLMEvents } from "#/lib/llm.server";

const MAX_HISTORY_MESSAGES = 40;

/** Caps history to the most recent N turns. */
function trimHistory(messages: ModelMessage[]): ModelMessage[] {
	if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
	return messages.slice(-MAX_HISTORY_MESSAGES);
}

/**
 * Pure chat stream: the client owns persistence (it hydrates from and writes to
 * the `Conversation.messages` blob via the persistence adapter), so this route
 * performs no database writes. It reads the conversation's config + endpoint,
 * resolves the system prompt and tools, dispatches to the LLM/agent runner, and
 * forwards the AG-UI event stream back.
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
				const userSettings = await prisma.userSettings.findUnique({ where: { ownerId: userId } });
				const systemPrompt = await buildSystemPrompt(
					userId,
					userSettings?.systemPrompt ?? undefined,
				);
				const tools = await resolveChatTools({ userId, conversationId, enabledTools });

				const source = streamLLMEvents(
					{
						url: endpoint.url,
						apiKey,
						model: conversation.model,
						messages: trimHistory(convertMessagesToModelMessages(params.messages)),
						systemPrompt,
						temperature: userSettings?.temperature ?? undefined,
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
