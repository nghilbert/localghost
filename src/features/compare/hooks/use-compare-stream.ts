import { EventType } from "@tanstack/ai/client";
import { fetchServerSentEvents } from "@tanstack/ai-client";
import { useRef, useState } from "react";
import type { Slot, SlotState } from "#/features/compare/lib/types";

// The endpoint is static, so the SSE connection adapter is created once and reused
// across every slot/run.
const connection = fetchServerSentEvents("/api/compare/stream");

export function useCompareStream() {
	const [results, setResults] = useState<Record<number, SlotState>>({});
	const [isStreaming, setIsStreaming] = useState(false);
	const abortRefs = useRef<Record<number, AbortController>>({});

	function patch(slotId: number, change: (cur: SlotState) => SlotState) {
		setResults((prev) => {
			const cur = prev[slotId] ?? { text: "", done: false, error: null };
			return { ...prev, [slotId]: change(cur) };
		});
	}

	async function run(slots: Slot[], prompt: string) {
		if (!prompt.trim() || isStreaming) return;
		for (const ctrl of Object.values(abortRefs.current)) ctrl.abort();
		abortRefs.current = {};

		const initial: Record<number, SlotState> = {};
		for (const s of slots) initial[s.id] = { text: "", done: false, error: null };
		setResults(initial);
		setIsStreaming(true);

		const promises = slots.map(async (slot) => {
			const ctrl = new AbortController();
			abortRefs.current[slot.id] = ctrl;

			try {
				const stream = connection.connect(
					[{ id: `compare-${slot.id}`, role: "user", parts: [{ type: "text", content: prompt }] }],
					{ endpointId: slot.endpointId, model: slot.model },
					ctrl.signal,
				);
				for await (const chunk of stream) {
					if (chunk.type === EventType.TEXT_MESSAGE_CONTENT) {
						patch(slot.id, (cur) => ({ ...cur, text: cur.text + chunk.delta }));
					} else if (chunk.type === EventType.RUN_ERROR) {
						patch(slot.id, (cur) => ({ ...cur, error: chunk.message, done: true }));
					}
				}
			} catch (err) {
				if ((err as Error).name === "AbortError") return;
				patch(slot.id, (cur) => ({ ...cur, error: (err as Error).message, done: true }));
			} finally {
				patch(slot.id, (cur) => ({ ...cur, done: true }));
			}
		});

		await Promise.allSettled(promises);
		setIsStreaming(false);
	}

	function stop() {
		for (const ctrl of Object.values(abortRefs.current)) ctrl.abort();
		abortRefs.current = {};
		setIsStreaming(false);
	}

	return { results, isStreaming, run, stop };
}
