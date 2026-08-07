import { z } from "zod/v4";
import { llamaDownloadFileProgressSchema } from "#/shared/domain/model/schemas";

/**
 * Thin `fetch` wrapper over `llama-server`'s router-mode HTTP API. There is no
 * official JS SDK for it (unlike Ollama); the surface is a few small REST calls.
 */
const llamaModelStatusSchema = z.enum(["loaded", "loading", "unloaded", "sleeping", "downloading"]);
export type LlamaModelStatus = z.infer<typeof llamaModelStatusSchema>;

const llamaModelSchema = z.object({
	id: z.string(),
	path: z.string().optional(),
	status: z.object({
		value: llamaModelStatusSchema,
		progress: z.record(z.string(), llamaDownloadFileProgressSchema).optional(),
		failed: z.boolean().optional(),
		exit_code: z.number().optional(),
	}),
	architecture: z
		.object({
			input_modalities: z.array(z.string()).optional(),
			output_modalities: z.array(z.string()).optional(),
		})
		.optional(),
});
const llamaModelListSchema = z.object({ data: z.array(llamaModelSchema) });

export type LlamaModel = z.infer<typeof llamaModelSchema>;

async function timeoutFetch({
	url,
	init,
	timeoutMs,
}: {
	url: string;
	init: RequestInit;
	timeoutMs: number;
}): Promise<Response> {
	return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

async function responseError({
	response,
	operation,
}: {
	response: Response;
	operation: string;
}): Promise<Error> {
	const body: unknown = await response.json().catch(() => null);
	if (typeof body === "object" && body !== null && "error" in body) {
		const error = body.error;
		if (typeof error === "object" && error !== null && "message" in error) {
			const message = error.message;
			if (typeof message === "string") return new Error(message);
		}
	}
	return new Error(`${operation} failed: ${response.status}`);
}

/** `Authorization` header for `--api-key`-protected llama-server instances; empty when unset. */
function authHeaders(apiKey: string | undefined): Record<string, string> {
	return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

/** Lists every model the router has discovered, with its load status. */
export async function listModels({
	url,
	apiKey,
	timeoutMs = 2500,
}: {
	url: string;
	apiKey?: string;
	timeoutMs?: number;
}): Promise<LlamaModel[]> {
	const response = await timeoutFetch({
		url: `${url}/models`,
		init: { headers: authHeaders(apiKey) },
		timeoutMs,
	});
	if (!response.ok) throw await responseError({ response, operation: "GET /models" });
	return llamaModelListSchema.parse(await response.json()).data;
}

/** A single connection attempt to llama.cpp's router model-event stream. */
async function fetchModelEventStream({
	url,
	apiKey,
	signal,
}: {
	url: string;
	apiKey?: string;
	signal: AbortSignal;
}): Promise<ReadableStream<Uint8Array>> {
	const response = await fetch(`${url}/models/sse`, {
		headers: { Accept: "text/event-stream", ...authHeaders(apiKey) },
		signal,
	});
	if (!response.ok) throw await responseError({ response, operation: "GET /models/sse" });
	if (!response.body) throw new Error("GET /models/sse returned no response body");
	return response.body;
}

/** Delay before retrying a dropped model-event stream: router recycles resolve in ~1-2s. */
const RECONNECT_DELAY_MS = 1000;

/**
 * Opens llama.cpp's long-lived router model-event stream. The router
 * recycles a model instance (a download finishing, a model
 * loading/unloading/sleeping) by dropping this connection; once connected,
 * a drop reopens a fresh stream and keeps piping instead of ending the
 * response, until `signal` aborts. Only the first connection attempt can
 * fail, so the caller still gets a real error when the endpoint itself is
 * unreachable.
 */
export async function openModelEventStream({
	url,
	apiKey,
	signal,
}: {
	url: string;
	apiKey?: string;
	signal: AbortSignal;
}): Promise<ReadableStream<Uint8Array>> {
	const initial = await fetchModelEventStream({ url, apiKey, signal });

	return new ReadableStream<Uint8Array>({
		async start(controller) {
			let source: ReadableStream<Uint8Array> | null = initial;
			while (!signal.aborted) {
				try {
					const upstream = source ?? (await fetchModelEventStream({ url, apiKey, signal }));
					source = null;
					const reader = upstream.getReader();
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						controller.enqueue(value);
					}
				} catch (error) {
					if (signal.aborted) break;
					console.warn("llama.cpp model-events stream dropped; reconnecting", error);
				}
				if (signal.aborted) break;
				await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
			}
			controller.close();
		},
	});
}

/** Triggers a non-blocking download of `model` (a `repo:QUANT` id) from Hugging Face. */
export async function downloadModel({
	url,
	model,
	apiKey,
}: {
	url: string;
	model: string;
	apiKey?: string;
}): Promise<void> {
	const response = await fetch(`${url}/models`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders(apiKey) },
		body: JSON.stringify({ model }),
	});
	if (!response.ok) throw await responseError({ response, operation: "POST /models" });
}

/** Removes a downloaded model's files from disk. */
export async function deleteModel({
	url,
	model,
	apiKey,
}: {
	url: string;
	model: string;
	apiKey?: string;
}): Promise<void> {
	const response = await fetch(`${url}/models?model=${encodeURIComponent(model)}`, {
		method: "DELETE",
		headers: authHeaders(apiKey),
	});
	if (!response.ok) throw await responseError({ response, operation: "DELETE /models" });
}

/** Unloads a model; also cancels an in-flight download for it. */
export async function unloadModel({
	url,
	model,
	apiKey,
}: {
	url: string;
	model: string;
	apiKey?: string;
}): Promise<void> {
	const response = await fetch(`${url}/models/unload`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders(apiKey) },
		body: JSON.stringify({ model }),
	});
	if (!response.ok) {
		throw await responseError({ response, operation: "POST /models/unload" });
	}
}
