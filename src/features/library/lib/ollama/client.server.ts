import { Ollama } from "ollama";

type Fetch = typeof fetch;

/** A `fetch` that aborts after `ms` — for one-shot Ollama calls that must time out. */
function timeoutFetch(ms: number): Fetch {
	return (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(ms) });
}

/**
 * An Ollama SDK client pointed at `host`. Pass `timeoutMs` for one-shot calls
 * (probe) that should fail fast; omit it for long-lived streams like
 * `pull`, whose own `AbortableAsyncIterator.abort()` handles cancellation.
 */
export function ollamaClient({ host, timeoutMs }: { host: string; timeoutMs?: number }): Ollama {
	return new Ollama(timeoutMs === undefined ? { host } : { host, fetch: timeoutFetch(timeoutMs) });
}
