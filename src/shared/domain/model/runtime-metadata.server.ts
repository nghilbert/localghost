import { serverProps } from "#/shared/lib/llamacpp/client.server";

const CONTEXT_WINDOW_TTL_MS = 60_000;
const contextWindowCache = new Map<string, { nCtx: number; expiresAt: number }>();

/**
 * Reads a loaded model's context window from llama-server and briefly caches it
 * per runtime and model. Returns undefined when the runtime cannot provide it.
 */
export async function getContextWindow({
	url,
	model,
	apiKey,
}: {
	url: string;
	model: string;
	apiKey?: string;
}): Promise<number | undefined> {
	const key = `${url}:${model}`;
	const cached = contextWindowCache.get(key);
	if (cached && cached.expiresAt > Date.now()) return cached.nCtx;

	try {
		const props = await serverProps({ url, model, apiKey, timeoutMs: 2000 });
		contextWindowCache.set(key, {
			nCtx: props.n_ctx,
			expiresAt: Date.now() + CONTEXT_WINDOW_TTL_MS,
		});
		return props.n_ctx;
	} catch {
		return undefined;
	}
}
