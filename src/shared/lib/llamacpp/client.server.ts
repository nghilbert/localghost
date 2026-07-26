/**
 * Thin `fetch` wrapper over `llama-server`'s router-mode HTTP API. There is no
 * official JS SDK for it (unlike Ollama); the surface is five small REST calls.
 */

import { Agent, fetch as undiciFetch } from "undici";

type LlamaModelStatus = "loaded" | "loading" | "unloaded";

export type LlamaModel = {
	id: string;
	path: string;
	status: { value: LlamaModelStatus };
	architecture?: { input_modalities?: string[]; output_modalities?: string[] };
};

export type LlamaProps = {
	n_ctx: number;
	modalities?: { vision?: boolean };
	chat_template_caps?: { tool_calls?: boolean };
};

async function timeoutFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
	return fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
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
	const res = await timeoutFetch(`${url}/models`, { headers: authHeaders(apiKey) }, timeoutMs);
	if (!res.ok) throw new Error(`GET /models failed: ${res.status}`);
	const json = (await res.json()) as { data: LlamaModel[] };
	return json.data;
}

/** Server properties for the currently (or about-to-be) loaded model, notably `n_ctx`. */
export async function serverProps({
	url,
	model,
	apiKey,
	timeoutMs = 2500,
}: {
	url: string;
	model?: string;
	apiKey?: string;
	timeoutMs?: number;
}): Promise<LlamaProps> {
	const query = model ? `?model=${encodeURIComponent(model)}` : "";
	const res = await timeoutFetch(
		`${url}/props${query}`,
		{ headers: authHeaders(apiKey) },
		timeoutMs,
	);
	if (!res.ok) throw new Error(`GET /props failed: ${res.status}`);
	return res.json() as Promise<LlamaProps>;
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
	const res = await fetch(`${url}/models`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders(apiKey) },
		body: JSON.stringify({ model }),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(body?.error?.message ?? `POST /models failed: ${res.status}`);
	}
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
	const res = await fetch(`${url}/models?model=${encodeURIComponent(model)}`, {
		method: "DELETE",
		headers: authHeaders(apiKey),
	});
	if (!res.ok) throw new Error(`DELETE /models failed: ${res.status}`);
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
	const res = await fetch(`${url}/models/unload`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders(apiKey) },
		body: JSON.stringify({ model }),
	});
	if (!res.ok) throw new Error(`POST /models/unload failed: ${res.status}`);
}

/** One `/models/sse` event: the router's current view of a model's state. */
export type ModelStateEvent = {
	model: string;
	status: LlamaModelStatus | "downloading" | "error";
	completed?: number;
	total?: number;
	error?: string;
};

// Undici's default body timeout (5 min between chunks) kills a quiet SSE
// stream; the router's own --sse-ping-interval keeps bytes flowing in
// practice, but this dispatcher removes the timeout as a second line of
// defense so a slow ping cadence can't tear the subscription down.
const sseDispatcher = new Agent({ bodyTimeout: 0, headersTimeout: 0 });

/** Subscribes to the router's live model-state stream until `signal` aborts. */
export async function* watchModels({
	url,
	apiKey,
	signal,
}: {
	url: string;
	apiKey?: string;
	signal: AbortSignal;
}): AsyncGenerator<ModelStateEvent> {
	const res = await undiciFetch(`${url}/models/sse`, {
		signal,
		dispatcher: sseDispatcher,
		headers: authHeaders(apiKey),
	});
	if (!res.ok || !res.body) throw new Error(`GET /models/sse failed: ${res.status}`);
	// undici's ReadableStream type isn't DOM-compatible with TextDecoderStream,
	// so decode raw chunks by hand instead of piping through it.
	const decoder = new TextDecoder();
	const reader = res.body.getReader();
	let buffer = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) return;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n\n");
			buffer = lines.pop() ?? "";
			for (const chunk of lines) {
				const data = chunk
					.split("\n")
					.find((line) => line.startsWith("data:"))
					?.slice(5)
					.trim();
				if (!data) continue;
				yield JSON.parse(data) as ModelStateEvent;
			}
		}
	} finally {
		reader.releaseLock();
	}
}
