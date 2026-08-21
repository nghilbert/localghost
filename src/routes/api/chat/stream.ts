import {
	chatParamsFromRequestBody,
	memoryStream,
	resumeServerSentEventsResponse,
	type StreamChunk,
	toServerSentEventsResponse,
} from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { memoryMiddleware } from "@tanstack/ai-memory";
import { reconstructChat, withPersistence } from "@tanstack/ai-persistence";
import { createFileRoute } from "@tanstack/react-router";
import { buildChatTools } from "#/shared/domain/chat/agent.server";
import { chatPersistence } from "#/shared/domain/chat/chat-persistence.server";
import { resolveGenerationOptions } from "#/shared/domain/chat/resolve-generation-options";
import { chatStreamForwardedPropsSchema } from "#/shared/domain/chat/schemas";
import { buildChatSystemPrompt } from "#/shared/domain/chat/system-prompt";
import {
	conversationOwnedBy,
	findConversationWithEndpoint,
} from "#/shared/domain/conversation/conversation.server";
import { endpointApiKey } from "#/shared/domain/endpoint/endpoint.server";
import { samplingOptionsSchema } from "#/shared/domain/endpoint/schemas";
import { memoryAdapter } from "#/shared/domain/memory/memory-adapter.server";
import { getModelSetting } from "#/shared/domain/model-setting/model-setting.server";
import { findUserSettings } from "#/shared/domain/user-settings/user-settings.server";
import { BodyTooLargeError, readJsonWithLimit } from "#/shared/lib/http.server";
import { streamLLMEvents } from "#/shared/lib/llm.server";
import { asLLMProvider } from "#/shared/lib/llm-provider";
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
				let body: unknown;
				try {
					body = await readJsonWithLimit({ request, maxBytes: MAX_BODY_BYTES });
				} catch (err) {
					if (err instanceof BodyTooLargeError) return new Response(err.message, { status: 413 });
					return new Response("Invalid JSON", { status: 400 });
				}
				const params = await chatParamsFromRequestBody(body);
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
				const tools = buildChatTools({ enabledTools });
				const endpointOptions = samplingOptionsSchema.safeParse(endpoint.options);
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

				// One controller cancels the whole run: `toServerSentEventsResponse`
				// fires it when the client drops the SSE connection, and `chat()`
				// aborts the in-flight provider request instead of generating to
				// completion against a listener that has gone away.
				const abortController = new AbortController();
				if (request.signal.aborted) abortController.abort();
				else request.signal.addEventListener("abort", () => abortController.abort());

				const source = streamLLMEvents({
					url: endpoint.url,
					provider: asLLMProvider(endpoint.provider),
					apiKey: endpointApiKey(endpoint),
					model: conversation.model,
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

				return toServerSentEventsResponse(withErrorHandling(), {
					abortController,
					durability: { adapter: memoryStream(request) },
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
