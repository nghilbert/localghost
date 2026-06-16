import { EventType } from "@tanstack/ai/client";
import { fetchServerSentEvents } from "@tanstack/ai-client";
import {
	experimental_streamedQuery as streamedQuery,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { Slot, SlotState } from "#/features/compare/lib/types";

// The endpoint is static, so the SSE connection adapter is created once and reused
// across every slot/run.
const connection = fetchServerSentEvents("/api/compare/stream");

const GC_TIME = 5 * 60_000;
const EMPTY_SLOT_STATE: SlotState = { text: "", done: false, error: null };

// A run is the source of truth for the active comparison. It lives in the query
// cache (not component state) so the streamed results survive a tab switch:
// `CompareTab` unmounts when you leave the Compare tab, but the cached run and its
// in-flight per-slot streams persist and reattach on return.
type CompareRun = { runId: number; prompt: string; slots: Slot[] };

export type SlotChunk =
	| { type: "text"; delta: string }
	| { type: "error"; message: string }
	| { type: "done" };

const RUN_KEY = ["compare", "run"] as const;
const slotStreamKey = (runId: number, slotId: number) =>
	["compare", "stream", runId, slotId] as const;

async function* streamSlot(
	slot: Slot,
	prompt: string,
	signal: AbortSignal,
): AsyncIterable<SlotChunk> {
	const stream = connection.connect(
		[{ id: `compare-${slot.id}`, role: "user", parts: [{ type: "text", content: prompt }] }],
		{ endpointId: slot.endpointId, model: slot.model },
		signal,
	);
	for await (const chunk of stream) {
		if (chunk.type === EventType.TEXT_MESSAGE_CONTENT) {
			yield { type: "text", delta: chunk.delta };
		} else if (chunk.type === EventType.RUN_ERROR) {
			yield { type: "error", message: chunk.message };
		}
	}
	yield { type: "done" };
}

export function reduceSlot(acc: SlotState, chunk: SlotChunk): SlotState {
	if (chunk.type === "text") return { ...acc, text: acc.text + chunk.delta };
	if (chunk.type === "error") return { ...acc, error: chunk.message, done: true };
	return { ...acc, done: true };
}

export function useCompareStream() {
	const queryClient = useQueryClient();

	const { data: activeRun } = useQuery<CompareRun | null>({
		queryKey: RUN_KEY,
		queryFn: () => null,
		enabled: false,
		initialData: null,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: GC_TIME,
	});

	const slots = activeRun?.slots ?? [];

	const queries = useQueries({
		queries: slots.map((slot) => ({
			queryKey: slotStreamKey(activeRun?.runId ?? 0, slot.id),
			queryFn: streamedQuery({
				streamFn: (ctx) => streamSlot(slot, activeRun?.prompt ?? "", ctx.signal),
				reducer: reduceSlot,
				initialValue: EMPTY_SLOT_STATE,
			}),
			staleTime: Number.POSITIVE_INFINITY,
			gcTime: GC_TIME,
			retry: false,
		})),
	});

	const results: Record<number, SlotState> = {};
	slots.forEach((slot, index) => {
		const query = queries[index];
		const data = query?.data ?? EMPTY_SLOT_STATE;
		// A slot is done once its stream settles — completion, error, or a Stop that
		// cancelled the query — so the streaming indicator clears in every case.
		const settled = query !== undefined && query.fetchStatus !== "fetching" && query.isFetched;
		results[slot.id] = settled ? { ...data, done: true } : data;
	});

	const isStreaming = queries.some((query) => query.fetchStatus === "fetching");

	async function run(nextSlots: Slot[], prompt: string) {
		if (!prompt.trim() || isStreaming) return;
		await queryClient.cancelQueries({ queryKey: ["compare", "stream"] });
		queryClient.setQueryData<CompareRun>(RUN_KEY, { runId: Date.now(), prompt, slots: nextSlots });
	}

	function stop() {
		queryClient.cancelQueries({ queryKey: ["compare", "stream"] });
	}

	return { results, resultSlots: activeRun?.slots ?? null, isStreaming, run, stop };
}
