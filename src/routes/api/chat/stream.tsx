import {
	chatParamsFromRequestBody,
	type StreamChunk,
	toServerSentEventsResponse,
} from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { createFileRoute } from "@tanstack/react-router";
import { buildChatTools } from "#/shared/domain/chat/agent.server";
import { resolveGenerationOptions } from "#/shared/domain/chat/resolve-generation-options";
import { chatStreamForwardedPropsSchema } from "#/shared/domain/chat/schemas";
import { buildChatSystemPrompt } from "#/shared/domain/chat/system-prompt";
import { findConversationWithEndpoint } from "#/shared/domain/conversation/conversation.server";
import { trimHistory } from "#/shared/domain/conversation/messages";
import { endpointApiKey } from "#/shared/domain/endpoint/endpoint.server";
import { ollamaOptionsSchema } from "#/shared/domain/endpoint/schemas";
import { getModelSetting } from "#/shared/domain/model-setting/model-setting.server";
import { findUserSettings } from "#/shared/domain/user-settings/user-settings.server";
import { auth } from "#/shared/lib/auth.server";
import { asLLMProvider, streamLLMEvents } from "#/shared/lib/llm.server";

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

				const conversation = await findConversationWithEndpoint({
					id: conversationId,
					ownerId: userId,
				});
				if (!conversation) return new Response("Conversation not found", { status: 404 });
				if (!conversation.endpoint || !conversation.model)
					return new Response("No provider endpoint configured", { status: 400 });

				const endpoint = conversation.endpoint;

				// Three layers of generation settings, most specific wins: user-global
				// (systemPrompt, temperature) < per-endpoint options < per-model options.
				const userSettings = await findUserSettings({ ownerId: userId });
				const tools = buildChatTools({ ownerId: userId, enabledTools });
				const endpointOptions = ollamaOptionsSchema.safeParse(endpoint.options);
				const modelOptions = await getModelSetting({
					endpointId: endpoint.id,
					model: conversation.model,
					ownerId: userId,
				});
				const generationOptions = resolveGenerationOptions({
					userTemperature: userSettings.temperature,
					endpointOptions: endpointOptions.success ? endpointOptions.data : undefined,
					modelOptions,
				});

				const source = streamLLMEvents({
					url: endpoint.url,
					provider: asLLMProvider(endpoint.provider),
					apiKey: endpointApiKey(endpoint),
					model: conversation.model,
					// `chat()` accepts the wire messages as-is and converts internally.
					messages: trimHistory(params.messages),
					systemPrompt: buildChatSystemPrompt({
						userPrompt: userSettings.systemPrompt,
						enabledTools,
						timeZone,
					}),
					temperature: generationOptions.temperature,
					options: generationOptions.options,
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
