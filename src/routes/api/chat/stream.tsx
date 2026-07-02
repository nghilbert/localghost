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
import { chatStreamForwardedPropsSchema } from "#/features/chat/lib/schemas";
import { ollamaOptionsSchema } from "#/features/endpoints/lib/schemas";
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
 * The current server date and time, so models answer time questions directly
 * instead of searching or hallucinating.
 */
function currentDateTimeLine(): string {
	const now = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
	return `Current date and time: ${now}.`;
}

/**
 * Pure chat stream: the client owns persistence, so this route writes nothing
 * to the database. It reads the conversation's config, resolves the system
 * prompt and tools, and forwards the LLM's AG-UI event stream back.
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
				const { conversationId, enabledTools, forceWebSearch } = forwarded.data;

				const conversation = await prisma.conversation.findFirst({
					where: { id: conversationId, ownerId: userId },
					include: { endpoint: true },
				});
				if (!conversation) return new Response("Conversation not found", { status: 404 });
				if (!conversation.endpoint || !conversation.model)
					return new Response("No provider endpoint configured", { status: 400 });

				const endpoint = conversation.endpoint;
				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;

				// System prompt + temperature are global per-user chat defaults stored on the
				// user row; per-endpoint generation options (Ollama) override them where set.
				const userSettings = await prisma.user.findUnique({
					where: { id: userId },
					select: { systemPrompt: true, temperature: true },
				});
				const tools = buildChatTools({ ownerId: userId, enabledTools });
				const endpointOptions = ollamaOptionsSchema.safeParse(endpoint.options);

				// Always ground the model in the current date/time; when the user forces
				// web search, append a directive on top of the user's own system prompt.
				const systemPrompt = [
					currentDateTimeLine(),
					userSettings?.systemPrompt?.trim(),
					forceWebSearch &&
						"Use the web_search tool to look up current information before answering this message.",
				]
					.filter(Boolean)
					.join("\n\n");

				const source = streamLLMEvents(
					{
						url: endpoint.url,
						apiKey,
						model: conversation.model,
						messages: trimHistory(convertMessagesToModelMessages(params.messages)),
						systemPrompt,
						temperature: userSettings?.temperature ?? undefined,
						options: endpointOptions.success ? endpointOptions.data : undefined,
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
