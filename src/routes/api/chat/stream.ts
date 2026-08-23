import { memoryStream, resumeServerSentEventsResponse } from "@tanstack/ai";
import { memoryMiddleware } from "@tanstack/ai-memory";
import { reconstructChat, withPersistence } from "@tanstack/ai-persistence";
import { createFileRoute } from "@tanstack/react-router";
import { buildChatTools } from "#/shared/domain/chat/agent.server";
import { chatPersistence } from "#/shared/domain/chat/persistence.server";
import { resolveGenerationOptions } from "#/shared/domain/chat/resolve-generation-options";
import { chatStreamForwardedPropsSchema } from "#/shared/domain/chat/schemas";
import { buildChatSystemPrompt } from "#/shared/domain/chat/system-prompt";
import {
	conversationOwnedBy,
	findConversationWithEndpoint,
} from "#/shared/domain/conversation/conversation.server";
import { endpointApiKey } from "#/shared/domain/endpoint/endpoint.server";
import { samplingOptionsSchema } from "#/shared/domain/endpoint/schemas";
import { memoryAdapter } from "#/shared/domain/memory/adapter.server";
import { getModelSetting } from "#/shared/domain/model-setting/model-setting.server";
import { findUserSettings } from "#/shared/domain/user-settings/user-settings.server";
import { streamLLMEvents } from "#/shared/lib/llm/client.server";
import { asLLMProvider } from "#/shared/lib/llm/provider";
import { readRunParams, streamRunResponse } from "#/shared/lib/llm/stream.server";
import { authedRequest } from "#/shared/lib/middleware";

// Roomy enough for a full history carrying image attachments as data URLs.
const MAX_BODY_BYTES = 64 * 1024 * 1024;

/**
 * The chat stream: `withPersistence` writes the transcript/run/interrupt state
 * here on every turn, `memoryMiddleware` recalls and exposes memory tools. The
 * GET handler serves two different jobs off the same URL, split by query
 * string: a `threadId` hydration request (`reconstructChat`) or a resumable-
 * stream rejoin (`?offset`/`Last-Event-ID`).
 */
export const Route = createFileRoute("/api/chat/stream")({
	server: {
		middleware: [authedRequest],
		handlers: {
			POST: async ({ request, context: { userId } }) => {
				const read = await readRunParams({ request, maxBytes: MAX_BODY_BYTES });
				if (!read.ok) return read.response;
				const { params } = read;
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
				const model = conversation.model;

				// Three layers of generation settings, most specific wins: user-global
				// (systemPrompt, temperature) < per-endpoint options < per-model options.
				const userSettings = await findUserSettings({ ownerId: userId });
				const tools = buildChatTools({ enabledTools });
				const endpointOptions = samplingOptionsSchema.safeParse(endpoint.options);
				const modelOptions = await getModelSetting({
					endpointId: endpoint.id,
					model,
					ownerId: userId,
				});
				const generationOptions = resolveGenerationOptions({
					userTemperature: userSettings.temperature,
					endpointOptions: endpointOptions.success ? endpointOptions.data : undefined,
					modelOptions,
				});

				return streamRunResponse({
					request,
					errorMessage: "LLM request failed",
					run: (abortController) =>
						streamLLMEvents({
							url: endpoint.url,
							provider: asLLMProvider(endpoint.provider),
							apiKey: endpointApiKey(endpoint),
							model,
							// `chat()` accepts the wire messages as-is and converts internally.
							messages: params.messages,
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
							abortController,
							resume: params.resume,
							middleware: [
								withPersistence(chatPersistence),
								memoryMiddleware({
									adapter: memoryAdapter,
									scope: { threadId: params.threadId, userId },
								}),
							],
						}),
				});
			},
			GET: async ({ request, context: { userId } }) => {
				// A hydration request carries `?threadId`; a stream rejoin carries
				// `?offset`/`runId` (or a `Last-Event-ID` header) instead.
				if (new URL(request.url).searchParams.has("threadId")) {
					return reconstructChat(chatPersistence, request, {
						authorize: (threadId) => conversationOwnedBy({ id: threadId, ownerId: userId }),
					});
				}
				// Lets a dropped connection or a page reload re-attach to an in-flight
				// or just-finished run and replay it from the durability log instead of
				// losing the partial reply; `fetchServerSentEvents` calls this automatically.
				return resumeServerSentEventsResponse({ adapter: memoryStream(request) });
			},
		},
	},
});
