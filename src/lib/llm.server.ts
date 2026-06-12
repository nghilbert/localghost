export type LLMProvider = "anthropic" | "ollama" | "openai" | "openrouter" | "groq";

export type LLMMessage = {
	role: "system" | "user" | "assistant" | "tool";
	content: string | LLMContentBlock[];
	tool_call_id?: string;
	tool_calls?: LLMToolCall[];
};

export type LLMContentBlock =
	| { type: "text"; text: string }
	| { type: "image_url"; image_url: { url: string } };

export type LLMToolCall = {
	id: string;
	type: "function";
	function: { name: string; arguments: string };
};

export type LLMTool = {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
};

export type SSEChunk =
	| { type: "delta"; delta: string }
	| { type: "thinking"; delta: string }
	| { type: "tool_calls"; calls: LLMToolCall[] }
	| { type: "usage"; input_tokens: number; output_tokens: number }
	| { type: "done" }
	| { type: "error"; error: string };

export type StreamLLMOptions = {
	url: string;
	apiKey?: string;
	model: string;
	messages: LLMMessage[];
	tools?: LLMTool[];
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
};

export function detectProvider(url: string): LLMProvider {
	const u = url.toLowerCase();
	if (u.includes("anthropic.com")) return "anthropic";
	if (u.includes(":11434") || u.includes("ollama.com")) return "ollama";
	if (u.includes("openrouter.ai")) return "openrouter";
	if (u.includes("groq.com")) return "groq";
	return "openai";
}

function buildHeaders(provider: LLMProvider, apiKey?: string): Record<string, string> {
	const base: Record<string, string> = { "Content-Type": "application/json" };
	if (provider === "anthropic") {
		if (apiKey) base["x-api-key"] = apiKey;
		base["anthropic-version"] = "2023-06-01";
		base["anthropic-beta"] = "interleaved-thinking-2025-05-14";
	} else {
		if (apiKey) base.Authorization = `Bearer ${apiKey}`;
		if (provider === "openrouter") {
			base["HTTP-Referer"] = "https://pretty-odysseus.app";
		}
	}
	return base;
}

function normalizeUrl(url: string, provider: LLMProvider): string {
	const base = url.replace(/\/$/, "");
	if (provider === "anthropic") {
		return base.endsWith("/messages") ? base : `${base}/v1/messages`;
	}
	if (provider === "ollama") {
		return base.endsWith("/chat") ? base : `${base}/api/chat`;
	}
	return base.endsWith("/completions") ? base : `${base}/v1/chat/completions`;
}

function buildAnthropicBody(
	model: string,
	messages: LLMMessage[],
	tools?: LLMTool[],
	temperature = 0.7,
	maxTokens = 4096,
) {
	// Anthropic: separate system messages
	const systemMsgs = messages.filter((m) => m.role === "system");
	const nonSystem = messages.filter((m) => m.role !== "system");
	const system =
		systemMsgs.map((m) => (typeof m.content === "string" ? m.content : "")).join("\n\n") ||
		undefined;

	const body: Record<string, unknown> = {
		model,
		max_tokens: maxTokens,
		temperature: Math.min(Math.max(temperature, 0), 1),
		stream: true,
		messages: nonSystem.map((m) => ({
			role: m.role === "tool" ? "user" : m.role,
			content: typeof m.content === "string" ? m.content : m.content,
		})),
	};
	if (system) body.system = system;
	if (tools?.length) {
		body.tools = tools.map((t) => ({
			name: t.function.name,
			description: t.function.description,
			input_schema: t.function.parameters,
		}));
	}
	return body;
}

function buildOpenAIBody(
	model: string,
	messages: LLMMessage[],
	tools?: LLMTool[],
	temperature = 0.7,
	maxTokens = 4096,
) {
	const isReasoning = /^(o1|o3|o4)/.test(model);
	const body: Record<string, unknown> = {
		model,
		stream: true,
		messages: messages.map((m) => {
			if (m.role === "tool") {
				return { role: "tool", content: m.content, tool_call_id: m.tool_call_id };
			}
			if (m.tool_calls?.length) {
				return { role: m.role, content: m.content, tool_calls: m.tool_calls };
			}
			return { role: m.role, content: m.content };
		}),
	};
	if (isReasoning) {
		body.max_completion_tokens = maxTokens;
	} else {
		body.temperature = temperature;
		body.max_tokens = maxTokens;
	}
	if (tools?.length) body.tools = tools;
	return body;
}

function buildOllamaBody(
	model: string,
	messages: LLMMessage[],
	tools?: LLMTool[],
	temperature = 0.7,
	maxTokens = 4096,
) {
	const body: Record<string, unknown> = {
		model,
		stream: true,
		options: { temperature, num_predict: maxTokens },
		messages: messages.map((m) => ({
			role: m.role === "tool" ? "user" : m.role,
			content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
		})),
	};
	if (tools?.length) body.tools = tools;
	return body;
}

async function* parseAnthropicStream(
	reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<SSEChunk> {
	const decoder = new TextDecoder();
	let buffer = "";
	const pendingToolCalls: LLMToolCall[] = [];
	let currentToolIndex = -1;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			if (!line.startsWith("data: ")) continue;
			const data = line.slice(6).trim();
			if (!data || data === "[DONE]") continue;
			try {
				const evt = JSON.parse(data);
				if (evt.type === "content_block_delta") {
					const delta = evt.delta;
					if (delta.type === "text_delta") {
						yield { type: "delta", delta: delta.text };
					} else if (delta.type === "thinking_delta") {
						yield { type: "thinking", delta: delta.thinking };
					} else if (delta.type === "input_json_delta" && currentToolIndex >= 0) {
						const pending = pendingToolCalls[currentToolIndex];
						if (pending) pending.function.arguments += delta.partial_json;
					}
				} else if (evt.type === "content_block_start") {
					if (evt.content_block?.type === "tool_use") {
						currentToolIndex++;
						pendingToolCalls[currentToolIndex] = {
							id: evt.content_block.id,
							type: "function",
							function: { name: evt.content_block.name, arguments: "" },
						};
					}
				} else if (evt.type === "message_delta" && evt.usage) {
					yield {
						type: "usage",
						input_tokens: evt.usage.input_tokens ?? 0,
						output_tokens: evt.usage.output_tokens ?? 0,
					};
				} else if (evt.type === "message_stop") {
					if (pendingToolCalls.length > 0) {
						yield { type: "tool_calls", calls: pendingToolCalls };
					}
					yield { type: "done" };
				}
			} catch {
				// ignore malformed chunks
			}
		}
	}
}

async function* parseOpenAIStream(
	reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<SSEChunk> {
	const decoder = new TextDecoder();
	let buffer = "";
	const pendingToolCalls: LLMToolCall[] = [];

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			if (!line.startsWith("data: ")) continue;
			const data = line.slice(6).trim();
			if (data === "[DONE]") {
				if (pendingToolCalls.length > 0) {
					yield { type: "tool_calls", calls: pendingToolCalls };
				}
				yield { type: "done" };
				continue;
			}
			try {
				const evt = JSON.parse(data);
				const choice = evt.choices?.[0];
				if (!choice) continue;
				const delta = choice.delta;
				if (delta?.content) {
					yield { type: "delta", delta: delta.content };
				}
				if (delta?.tool_calls) {
					for (const tc of delta.tool_calls) {
						const idx: number = tc.index ?? 0;
						if (!pendingToolCalls[idx]) {
							pendingToolCalls[idx] = {
								id: tc.id ?? `call_${idx}`,
								type: "function",
								function: { name: tc.function?.name ?? "", arguments: "" },
							};
						}
						if (tc.function?.name) pendingToolCalls[idx].function.name = tc.function.name;
						if (tc.function?.arguments)
							pendingToolCalls[idx].function.arguments += tc.function.arguments;
					}
				}
				if (evt.usage) {
					yield {
						type: "usage",
						input_tokens: evt.usage.prompt_tokens ?? 0,
						output_tokens: evt.usage.completion_tokens ?? 0,
					};
				}
			} catch {
				// ignore malformed chunks
			}
		}
	}
}

async function* parseOllamaStream(
	reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<SSEChunk> {
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			try {
				const evt = JSON.parse(trimmed);
				if (evt.message?.content) {
					yield { type: "delta", delta: evt.message.content };
				}
				if (evt.done) {
					if (evt.message?.tool_calls?.length) {
						yield {
							type: "tool_calls",
							calls: evt.message.tool_calls.map(
								(tc: { function: { name: string; arguments: unknown } }, i: number) => ({
									id: `call_${i}`,
									type: "function",
									function: {
										name: tc.function.name,
										arguments:
											typeof tc.function.arguments === "string"
												? tc.function.arguments
												: JSON.stringify(tc.function.arguments),
									},
								}),
							),
						};
					}
					yield { type: "done" };
				}
			} catch {
				// ignore malformed chunks
			}
		}
	}
}

export async function streamLLM(opts: StreamLLMOptions): Promise<ReadableStream<SSEChunk>> {
	const provider = detectProvider(opts.url);
	const url = normalizeUrl(opts.url, provider);
	const headers = buildHeaders(provider, opts.apiKey);

	// Prepend system prompt if provided and not already the first message
	const messages = opts.systemPrompt
		? [
				{ role: "system" as const, content: opts.systemPrompt },
				...opts.messages.filter((m) => m.role !== "system"),
			]
		: opts.messages;

	let body: Record<string, unknown>;
	if (provider === "anthropic") {
		body = buildAnthropicBody(opts.model, messages, opts.tools, opts.temperature, opts.maxTokens);
	} else if (provider === "ollama") {
		body = buildOllamaBody(opts.model, messages, opts.tools, opts.temperature, opts.maxTokens);
	} else {
		body = buildOpenAIBody(opts.model, messages, opts.tools, opts.temperature, opts.maxTokens);
	}

	const response = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});

	if (!response.ok || !response.body) {
		const text = await response.text().catch(() => "");
		throw new Error(`LLM request failed: ${response.status} ${text}`);
	}

	const reader = response.body.getReader();
	let gen: AsyncGenerator<SSEChunk>;
	if (provider === "anthropic") {
		gen = parseAnthropicStream(reader);
	} else if (provider === "ollama") {
		gen = parseOllamaStream(reader);
	} else {
		gen = parseOpenAIStream(reader);
	}

	return new ReadableStream<SSEChunk>({
		async pull(controller) {
			const { done, value } = await gen.next();
			if (done) {
				controller.close();
			} else {
				controller.enqueue(value);
			}
		},
		cancel() {
			reader.cancel();
		},
	});
}

export async function callLLM(opts: StreamLLMOptions): Promise<string> {
	const stream = await streamLLM(opts);
	const reader = stream.getReader();
	let text = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value.type === "delta") text += value.delta;
	}
	return text;
}

export type EndpointProbeResult = {
	ok: boolean;
	status?: number;
	modelCount?: number;
	error?: string;
};

/**
 * Probes a provider's model-list endpoint with real auth so failures are
 * distinguishable — unlike listModels, which collapses errors into [].
 */
export async function probeEndpoint(url: string, apiKey?: string): Promise<EndpointProbeResult> {
	const provider = detectProvider(url);
	const base = url.replace(/\/$/, "");
	const modelsUrl = provider === "ollama" ? `${base}/api/tags` : `${base}/v1/models`;
	try {
		const res = await fetch(modelsUrl, {
			headers: buildHeaders(provider, apiKey),
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) {
			const reason = res.status === 401 || res.status === 403 ? "API key rejected" : res.statusText;
			return { ok: false, status: res.status, error: `${reason} (HTTP ${res.status})` };
		}
		const data = (await res.json()) as { data?: unknown[]; models?: unknown[] };
		return { ok: true, status: res.status, modelCount: (data.data ?? data.models ?? []).length };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
	}
}

export async function listModels(url: string, apiKey?: string): Promise<string[]> {
	const provider = detectProvider(url);
	const base = url.replace(/\/$/, "");
	try {
		if (provider === "anthropic") {
			const res = await fetch(`${base}/v1/models`, {
				headers: buildHeaders(provider, apiKey),
			});
			if (!res.ok) return [];
			const data = (await res.json()) as { data?: { id: string }[] };
			return (data.data ?? []).map((m) => m.id);
		}
		if (provider === "ollama") {
			const res = await fetch(`${base}/api/tags`, { headers: buildHeaders(provider, apiKey) });
			if (!res.ok) return [];
			const data = (await res.json()) as { models?: { name: string }[] };
			return (data.models ?? []).map((m) => m.name);
		}
		// OpenAI-compatible
		const res = await fetch(`${base}/v1/models`, {
			headers: buildHeaders(provider, apiKey),
		});
		if (!res.ok) return [];
		const data = (await res.json()) as { data?: { id: string }[] };
		return (data.data ?? []).map((m) => m.id);
	} catch {
		return [];
	}
}
