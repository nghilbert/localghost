import { useRef, useState } from "react";
import type { Slot, SlotState } from "./types";

export function useCompareStream() {
	const [results, setResults] = useState<Record<number, SlotState>>({});
	const [isStreaming, setIsStreaming] = useState(false);
	const abortRefs = useRef<Record<number, AbortController>>({});

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
				const res = await fetch("/api/compare/stream", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ prompt, endpointId: slot.endpointId, model: slot.model }),
					signal: ctrl.signal,
				});
				if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

				const reader = res.body.getReader();
				const dec = new TextDecoder();
				let buf = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buf += dec.decode(value, { stream: true });
					const lines = buf.split("\n");
					buf = lines.pop() ?? "";
					for (const line of lines) {
						if (!line.startsWith("data: ")) continue;
						try {
							const chunk = JSON.parse(line.slice(6));
							if (chunk.type === "delta") {
								setResults((prev) => {
									const cur = prev[slot.id] ?? { text: "", done: false, error: null };
									return {
										...prev,
										[slot.id]: { ...cur, text: cur.text + (chunk.delta as string) },
									};
								});
							} else if (chunk.type === "error") {
								setResults((prev) => {
									const cur = prev[slot.id] ?? { text: "", done: false, error: null };
									return {
										...prev,
										[slot.id]: { ...cur, error: chunk.error as string, done: true },
									};
								});
							} else if (chunk.type === "done") {
								setResults((prev) => {
									const cur = prev[slot.id] ?? { text: "", done: false, error: null };
									return { ...prev, [slot.id]: { ...cur, done: true } };
								});
							}
						} catch {
							// skip malformed line
						}
					}
				}
			} catch (err) {
				if ((err as Error).name === "AbortError") return;
				setResults((prev) => {
					const cur = prev[slot.id] ?? { text: "", done: false, error: null };
					return { ...prev, [slot.id]: { ...cur, error: (err as Error).message, done: true } };
				});
			} finally {
				setResults((prev) => {
					const cur = prev[slot.id] ?? { text: "", done: false, error: null };
					return { ...prev, [slot.id]: { ...cur, done: true } };
				});
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
