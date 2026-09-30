import type { PullProgress } from "#/features/library/library.types";
import {
	type LlamaModelDownloadEvent,
	llamaModelDownloadEventSchema,
} from "#/lib/llamacpp/schemas";
import { aggregatePullProgress } from "./pull-progress";

/**
 * Applies one llama.cpp model event to the progress map. Any event other than
 * `download_progress` ends that model's download, so its entry is removed.
 */
export function reduceDownloadEvent({
	byModel,
	event,
}: {
	byModel: Record<string, PullProgress>;
	event: LlamaModelDownloadEvent;
}): Record<string, PullProgress> {
	if (event.event === "download_progress") {
		const aggregated = aggregatePullProgress(event.data.progress);
		// Some progress events list no files; keep the last known bytes.
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
 * The parsed events from `/api/models/events`. `onOpen` runs on every connection, including
 * `EventSource` reconnects. Ends when `signal` aborts or the browser stops reconnecting.
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
		// CLOSED means the browser gave up reconnecting.
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
