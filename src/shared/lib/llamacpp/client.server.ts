import { Agent, type Response as UndiciResponse, fetch as undiciFetch } from "undici";
import { z } from "zod/v4";
import { llamaDownloadFileProgressSchema } from "#/shared/domain/model/schemas";

/**
 * Thin `fetch` wrapper over `llama-server`'s router-mode HTTP API. There is no
 * official JS SDK for it (unlike Ollama); the surface is a few small REST calls.
 */
const llamaModelStatusSchema = z.enum([
	"loaded",
	"loading",
	"unloaded",
	"sleeping",
	"downloading",
	"downloaded",
]);
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

/**
 * Key for the bundled llama.cpp service, mirroring its `LLAMA_API_KEY` (compose.yaml).
 * Every route but `/health` checks `--api-key`, so an endpoint configured without one still
 * needs this to reach `/models` and `/props`. A server started without one ignores the header.
 */
export const LOCAL_LLAMACPP_API_KEY = process.env.LLAMACPP_API_KEY || "local-llamacpp";

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

/**
 * `Authorization` header for `--api-key`-protected llama-server instances. Falls back to
 * {@link LOCAL_LLAMACPP_API_KEY} so a discovered endpoint with no stored key still reaches the
 * bundled server; a keyless llama.cpp of the user's own ignores the header regardless.
 */
function authHeaders(apiKey: string | undefined): Record<string, string> {
	const key = apiKey || LOCAL_LLAMACPP_API_KEY;
	return key ? { Authorization: `Bearer ${key}` } : {};
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

/**
 * Both the caps object and each flag are optional: builds before `chat_template_caps`
 * omit it, and an unknown capability must not read as a missing one.
 */
const llamaPropsSchema = z.object({
	chat_template: z.string().optional(),
	chat_template_caps: z
		.object({
			supports_tools: z.boolean().default(true),
			supports_tool_calls: z.boolean().default(true),
		})
		.loose()
		.optional(),
	default_generation_settings: z.object({ n_ctx: z.number().optional() }).loose().optional(),
});

export type LlamaProps = z.infer<typeof llamaPropsSchema>;

/**
 * One model's own chat template and capabilities. In router mode `?model=` is required
 * and the model is loaded on demand, so this blocks for as long as a load takes.
 */
export async function getProps({
	url,
	model,
	apiKey,
	timeoutMs = 120_000,
}: {
	url: string;
	model: string;
	apiKey?: string;
	timeoutMs?: number;
}): Promise<LlamaProps> {
	const response = await timeoutFetch({
		url: `${url}/props?model=${encodeURIComponent(model)}`,
		init: { headers: authHeaders(apiKey) },
		timeoutMs,
	});
	if (!response.ok) throw await responseError({ response, operation: "GET /props" });
	return llamaPropsSchema.parse(await response.json());
}

// `bodyTimeout: 0` disables undici's 5-min between-chunks timeout for this long-lived stream.
const modelEventDispatcher = new Agent({ bodyTimeout: 0 });

/** undici's response body stream; its element type diverges from the DOM `ReadableStream`. */
type ModelEventStream = NonNullable<UndiciResponse["body"]>;

/** A single connection attempt to llama.cpp's router model-event stream. */
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
