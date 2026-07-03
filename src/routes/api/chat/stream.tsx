import {
	chatParamsFromRequestBody,
	type StreamChunk,
	toServerSentEventsResponse,
} from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { buildChatTools } from "#/features/chat/lib/agent.server";
import { trimHistory } from "#/features/chat/lib/messages";
import { chatStreamForwardedPropsSchema } from "#/features/chat/lib/schemas";
import { buildChatSystemPrompt } from "#/features/chat/lib/system-prompt";
import { ollamaOptionsSchema } from "#/features/endpoints/lib/schemas";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { streamLLMEvents } from "#/lib/llm.server";

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
				const { conversationId, enabledTools, timeZone } = forwarded.data;

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

				const source = streamLLMEvents({
					url: endpoint.url,
					apiKey,
					model: conversation.model,
					// `chat()` accepts the wire messages as-is and converts internally.
					messages: trimHistory(params.messages),
					systemPrompt: buildChatSystemPrompt({
						userPrompt: userSettings?.systemPrompt,
						enabledTools,
						timeZone,
					}),
					temperature: userSettings?.temperature ?? undefined,
					options: endpointOptions.success ? endpointOptions.data : undefined,
					threadId: params.threadId,
					runId: params.runId,
					tools,
				});

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
