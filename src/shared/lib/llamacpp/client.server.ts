/**
 * Thin `fetch` wrapper over `llama-server`'s router-mode HTTP API. There is no
 * official JS SDK for it (unlike Ollama); the surface is five small REST calls.
 */

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

/** Lists every model the router has discovered, with its load status. */
export async function listModels({
	url,
	timeoutMs = 2500,
}: {
	url: string;
	timeoutMs?: number;
}): Promise<LlamaModel[]> {
	const res = await timeoutFetch(`${url}/models`, {}, timeoutMs);
	if (!res.ok) throw new Error(`GET /models failed: ${res.status}`);
	const json = (await res.json()) as { data: LlamaModel[] };
	return json.data;
}

/** Server properties for the currently (or about-to-be) loaded model, notably `n_ctx`. */
export async function serverProps({
	url,
	model,
	timeoutMs = 2500,
}: {
	url: string;
	model?: string;
	timeoutMs?: number;
}): Promise<LlamaProps> {
	const query = model ? `?model=${encodeURIComponent(model)}` : "";
	const res = await timeoutFetch(`${url}/props${query}`, {}, timeoutMs);
	if (!res.ok) throw new Error(`GET /props failed: ${res.status}`);
	return res.json() as Promise<LlamaProps>;
}

/** Triggers a non-blocking download of `model` (a `repo:QUANT` id) from Hugging Face. */
export async function downloadModel({ url, model }: { url: string; model: string }): Promise<void> {
	const res = await fetch(`${url}/models`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ model }),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(body?.error?.message ?? `POST /models failed: ${res.status}`);
	}
}

/** Removes a downloaded model's files from disk. */
export async function deleteModel({ url, model }: { url: string; model: string }): Promise<void> {
	const res = await fetch(`${url}/models?model=${encodeURIComponent(model)}`, { method: "DELETE" });
	if (!res.ok) throw new Error(`DELETE /models failed: ${res.status}`);
}

/** Unloads a model; also cancels an in-flight download for it. */
export async function unloadModel({ url, model }: { url: string; model: string }): Promise<void> {
	const res = await fetch(`${url}/models/unload`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
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

/** Subscribes to the router's live model-state stream until `signal` aborts. */
export async function* watchModels({
	url,
	signal,
}: {
	url: string;
	signal: AbortSignal;
}): AsyncGenerator<ModelStateEvent> {
	const res = await fetch(`${url}/models/sse`, { signal });
	if (!res.ok || !res.body) throw new Error(`GET /models/sse failed: ${res.status}`);
	const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) return;
			buffer += value;
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
