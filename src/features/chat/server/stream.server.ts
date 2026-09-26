import { memoryMiddleware } from "@tanstack/ai-memory";
import { reconstructChat, withPersistence } from "@tanstack/ai-persistence";
import { findUserSettings } from "#/features/account/server/user.server";
import { chatStreamForwardedPropsSchema, chatThreadIdSchema } from "#/features/chat/chat.schemas";
import { resolveGenerationOptions } from "#/features/chat/lib/generation-options";
import { buildChatSystemPrompt } from "#/features/chat/lib/system-prompt";
import { getModelSetting } from "#/features/library/server/model-setting.server";
import { memoryAdapter } from "#/features/memory/server/adapter.server";
import { endpointApiKey } from "#/lib/crypto.server";
import { streamLLMEvents } from "#/lib/llm.server";
import { asLLMProvider } from "#/lib/llm-provider";
import { samplingOptionsSchema } from "#/lib/llm-schemas";
import { readRunParams, resumeRunResponse, streamRunResponse } from "#/lib/llm-stream.server";
import { conversationOwnedBy, findConversationWithEndpoint } from "./chat.server";
import { chatPersistence, findRunThreadId } from "./persistence.server";
import { buildChatTools } from "./tools.server";

// Large enough for a history with image attachments as data URLs.
const MAX_BODY_BYTES = 64 * 1024 * 1024;

/** Runs a chat, saving it with `withPersistence` and adding memory with `memoryMiddleware`. */
export async function postChatStream({
	request,
	userId,
}: {
	request: Request;
	userId: string;
}): Promise<Response> {
	const read = await readRunParams({ request, maxBytes: MAX_BODY_BYTES });
	if (!read.ok) return read.response;
	const { params } = read;
	const forwarded = chatStreamForwardedPropsSchema.safeParse(params.forwardedProps);
	if (!forwarded.success) return new Response("Bad request", { status: 400 });
	const { enabledTools, timeZone } = forwarded.data;

	// The run belongs to `threadId`, so that is what gets authorized.
	const threadId = chatThreadIdSchema.safeParse(params.threadId);
	if (!threadId.success) return new Response("Bad request", { status: 400 });

	const conversation = await findConversationWithEndpoint({
		id: threadId.data,
		ownerId: userId,
	});
	if (!conversation) return new Response("Conversation not found", { status: 404 });
	// A distinct status, since the client sees only the status of a refused run.
	if (!conversation.endpoint || !conversation.model)
		return new Response("No provider endpoint configured", { status: 409 });

	// An existing run must belong to this thread.
	const runThreadId = await findRunThreadId({ runId: params.runId });
	if (runThreadId !== null && runThreadId !== threadId.data)
		return new Response("Forbidden", { status: 403 });

	const endpoint = conversation.endpoint;
	const model = conversation.model;

	// Settings merge from the user, then the endpoint, then the model; the most specific wins.
	const userSettings = await findUserSettings({ ownerId: userId });
	const endpointOptions = samplingOptionsSchema.safeParse(endpoint.options);
	const modelOptions = await getModelSetting({ endpointId: endpoint.id, model, ownerId: userId });
	const generationOptions = resolveGenerationOptions({
		userTemperature: userSettings.temperature,
		endpointOptions: endpointOptions.success ? endpointOptions.data : undefined,
		modelOptions,
	});

	return streamRunResponse({
		request,
		runId: params.runId,
		runs: chatPersistence.stores.runs,
		run: (abortController) =>
			streamLLMEvents({
				url: endpoint.url,
				provider: asLLMProvider(endpoint.provider),
				apiKey: endpointApiKey(endpoint),
				model,
				messages: params.messages,
				systemPrompt: buildChatSystemPrompt({
					userPrompt: userSettings.systemPrompt,
					enabledTools,
					timeZone,
				}),
				temperature: generationOptions.temperature,
				options: generationOptions.options,
				threadId: threadId.data,
				runId: params.runId,
				tools: buildChatTools({ enabledTools }),
				abortController,
				resume: params.resume,
				middleware: [
					withPersistence(chatPersistence),
					memoryMiddleware({
						adapter: memoryAdapter,
						scope: { threadId: threadId.data, userId },
					}),
				],
			}),
	});
}

/**
 * Loads a thread (`?threadId`), or reconnects to a running stream (`?offset` or
 * `Last-Event-ID`) so a dropped connection or a reload does not lose the partial reply.
 */
export function getChatStream({
	request,
	userId,
}: {
	request: Request;
	userId: string;
}): Promise<Response> {
	const authorize = (threadId: string) => conversationOwnedBy({ id: threadId, ownerId: userId });
	if (new URL(request.url).searchParams.has("threadId")) {
		return reconstructChat(chatPersistence, request, { authorize });
	}
	return resumeRunResponse({ request, findThreadId: findRunThreadId, authorize });
}
