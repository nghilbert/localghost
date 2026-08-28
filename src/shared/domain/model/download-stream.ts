import { aggregatePullProgress } from "#/shared/domain/model/pull-progress";
import {
	type LlamaModelDownloadEvent,
	llamaModelDownloadEventSchema,
} from "#/shared/domain/model/schemas";
import type { PullProgress } from "#/shared/domain/model/types";

/**
 * Folds one llama.cpp model event into the byte-progress map keyed by model id.
 * Only `download_progress` carries byte counts; every other event ends the download,
 * so its entry is dropped rather than left showing a frozen percentage.
 */
export function reduceDownloadEvent(
	byModel: Record<string, PullProgress>,
	event: LlamaModelDownloadEvent,
): Record<string, PullProgress> {
	if (event.event === "download_progress") {
		const aggregated = aggregatePullProgress(event.data.progress);
		// llama.cpp emits transitional frames with no file entries; they must not blank out known bytes.
		if (aggregated.completed === undefined || aggregated.total === undefined) return byModel;
		return { ...byModel, [event.model]: aggregated };
	}
	if (!(event.model in byModel)) return byModel;
	const { [event.model]: _ended, ...rest } = byModel;
	return rest;
}

function parseModelEvent(data: string): LlamaModelDownloadEvent | null {
	let value: unknown;
	try {
		value = JSON.parse(data);
	} catch {
		console.warn("Unparseable llama.cpp model event", { data });
		return null;
	}
	const parsed = llamaModelDownloadEventSchema.safeParse(value);
	if (!parsed.success) {
		console.warn("Unrecognized llama.cpp model event", { value, error: parsed.error });
		return null;
	}
	return parsed.data;
}

/**
 * Bridges llama.cpp's model-event SSE feed into an async iterable of parsed events.
 * EventSource reconnects on its own, so `onOpen` fires once per connection rather
 * than once per stream; the iterable ends only when `signal` aborts.
 */
export async function* streamModelEvents({
	endpointId,
	signal,
	onOpen,
}: {
	endpointId: string;
	signal: AbortSignal;
	onOpen?: () => void;
}): AsyncGenerator<LlamaModelDownloadEvent> {
	const search = new URLSearchParams({ endpointId });
	const source = new EventSource(`/api/models/events?${search}`);
	const queued: LlamaModelDownloadEvent[] = [];
	let closed = false;
	let wake: (() => void) | undefined;
	const resume = () => {
		wake?.();
		wake = undefined;
	};

	source.onopen = () => onOpen?.();
	source.onerror = () => {
		console.warn("llama.cpp model-event stream errored", { readyState: source.readyState });
		// CLOSED means the browser gave up reconnecting (e.g. a non-2xx response), so the
		// generator must end here too, or the query sits fetching with a dead connection behind it.
		if (source.readyState === EventSource.CLOSED) {
			closed = true;
			resume();
		}
	};
	source.onmessage = (message: MessageEvent<string>) => {
		const event = parseModelEvent(message.data);
		if (!event) return;
		queued.push(event);
		resume();
	};
	signal.addEventListener("abort", resume, { once: true });

	try {
		while (!signal.aborted && !closed) {
			const next = queued.shift();
			if (next) {
				yield next;
				continue;
			}
			await new Promise<void>((settle) => {
				wake = settle;
			});
		}
	} finally {
		signal.removeEventListener("abort", resume);
		source.close();
	}
}
