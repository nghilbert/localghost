import { Agent, type Response as UndiciResponse, fetch as undiciFetch } from "undici";
import { z } from "zod";
import { llamaDownloadFileProgressSchema } from "./schemas";

const llamaModelStatusSchema = z.enum([
	"loaded",
	"loading",
	"unloaded",
	"sleeping",
	"downloading",
	"downloaded",
]);

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

/** The router's `GET /models` body. */
export type LlamaModelList = z.input<typeof llamaModelListSchema>;

const llamaErrorSchema = z.object({ error: z.object({ message: z.string() }) });

/** The OpenAI-style error body the router sends with a failed request. */
export type LlamaError = z.input<typeof llamaErrorSchema>;

/** A model entry from the llama.cpp router's `/models`. */
export type LlamaModel = z.infer<typeof llamaModelSchema>;

/**
 * The bundled llama.cpp server's API key, from `LLAMA_API_KEY`, as in compose.yaml. A
 * server started without a key ignores it.
 */
export const LOCAL_LLAMACPP_API_KEY = process.env.LLAMA_API_KEY || "local-llamacpp";

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
	response: Response | UndiciResponse;
	operation: string;
}): Promise<Error> {
	const body = llamaErrorSchema.safeParse(await response.json().catch(() => null));
	return new Error(
		body.success ? body.data.error.message : `${operation} failed: ${response.status}`,
	);
}

/** Uses {@link LOCAL_LLAMACPP_API_KEY} when the endpoint has no key of its own. */
function authHeaders(apiKey: string | undefined): Record<string, string> {
	return { Authorization: `Bearer ${apiKey || LOCAL_LLAMACPP_API_KEY}` };
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

// Disables undici's 5 minute idle timeout, since this stream stays open.
const modelEventDispatcher = new Agent({ bodyTimeout: 0 });

/** undici's body stream type, which differs from the DOM `ReadableStream`. */
type ModelEventStream = NonNullable<UndiciResponse["body"]>;

async function fetchModelEventStream({
	url,
	apiKey,
	signal,
}: {
	url: string;
	apiKey?: string;
	signal: AbortSignal;
}): Promise<ModelEventStream> {
	const response = await undiciFetch(`${url}/models/sse`, {
		headers: { Accept: "text/event-stream", ...authHeaders(apiKey) },
		signal,
		dispatcher: modelEventDispatcher,
	});
	if (!response.ok) throw await responseError({ response, operation: "GET /models/sse" });
	if (!response.body) throw new Error("GET /models/sse returned no response body");
	return response.body;
}

const RECONNECT_DELAY_MS = 1000;

/**
 * Opens llama.cpp's model event stream (`/models/sse`). The router drops the connection
 * whenever a model changes state, so this reconnects until `signal` aborts. Only the first
 * connection can throw, so an unreachable server still reports an error.
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
			let source: ModelEventStream | null = initial;
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

/** Starts downloading `model` (a `repo:QUANT` id) from Hugging Face without waiting for it. */
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

/** Unloads a model, cancelling its download if one is running. */
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
