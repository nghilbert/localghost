import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon, PlusIcon, XIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "#/components/ui/button";
import { endpointsQueryOptions, getEndpointModels } from "#/features/chat/lib/chat.functions";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authenticated/compare")({
	component: ComparePage,
});

type Slot = {
	id: number;
	endpointId: string;
	model: string;
};

type SlotState = {
	text: string;
	done: boolean;
	error: string | null;
};

let slotSeq = 0;

function ComparePage() {
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());
	const firstEndpointId = endpoints[0]?.id ?? "";

	const [slots, setSlots] = useState<Slot[]>(() => [
		{ id: ++slotSeq, endpointId: firstEndpointId, model: "" },
		{ id: ++slotSeq, endpointId: firstEndpointId, model: "" },
	]);
	const [prompt, setPrompt] = useState("");
	const [streaming, setStreaming] = useState(false);
	const [results, setResults] = useState<Record<number, SlotState>>({});
	const [blind, setBlind] = useState(false);
	const abortRefs = useRef<Record<number, AbortController>>({});

	const updateSlot = (id: number, patch: Partial<Slot>) =>
		setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

	const addSlot = () => {
		if (slots.length >= 4) return;
		setSlots((prev) => [...prev, { id: ++slotSeq, endpointId: firstEndpointId, model: "" }]);
	};

	const removeSlot = (id: number) => {
		if (slots.length <= 2) return;
		setSlots((prev) => prev.filter((s) => s.id !== id));
	};

	const run = useCallback(async () => {
		if (!prompt.trim() || streaming) return;
		for (const ctrl of Object.values(abortRefs.current)) ctrl.abort();
		abortRefs.current = {};

		const initial: Record<number, SlotState> = {};
		for (const s of slots) initial[s.id] = { text: "", done: false, error: null };
		setResults(initial);
		setStreaming(true);

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
		setStreaming(false);
	}, [prompt, slots, streaming]);

	const stop = () => {
		for (const ctrl of Object.values(abortRefs.current)) ctrl.abort();
		abortRefs.current = {};
		setStreaming(false);
	};

	const hasResults = Object.keys(results).length > 0;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{/* Top bar */}
			<div className="border-b p-4 space-y-3">
				<div className="flex items-center gap-2">
					<h1 className="text-sm font-semibold">Model Compare</h1>
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto gap-1"
						onClick={() => setBlind((b) => !b)}
						disabled={!hasResults}
					>
						{blind ? <EyeIcon size={13} /> : <EyeOffIcon size={13} />}
						{blind ? "Reveal" : "Blind mode"}
					</Button>
				</div>

				{/* Slot selectors */}
				<div className="flex flex-wrap gap-2 items-end">
					{slots.map((slot, idx) => (
						<SlotPicker
							key={slot.id}
							slot={slot}
							label={blind ? `Model ${String.fromCharCode(65 + idx)}` : undefined}
							endpoints={endpoints}
							onChange={(patch) => updateSlot(slot.id, patch)}
							onRemove={slots.length > 2 ? () => removeSlot(slot.id) : undefined}
						/>
					))}
					{slots.length < 4 && (
						<Button variant="outline" size="sm" onClick={addSlot} className="gap-1 shrink-0">
							<PlusIcon size={12} />
							Add model
						</Button>
					)}
				</div>

				{/* Prompt */}
				<div className="flex gap-2">
					<textarea
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
								e.preventDefault();
								run();
							}
						}}
						placeholder="Enter prompt… (Ctrl+Enter to compare)"
						rows={2}
						className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
					/>
					{streaming ? (
						<Button variant="outline" onClick={stop} className="shrink-0">
							Stop
						</Button>
					) : (
						<Button
							onClick={run}
							disabled={!prompt.trim() || slots.some((s) => !s.model)}
							className="shrink-0"
						>
							Compare
						</Button>
					)}
				</div>
			</div>

			{/* Results grid */}
			<div
				className="flex-1 overflow-auto p-4"
				style={{
					display: "grid",
					gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))`,
					gap: "0.75rem",
				}}
			>
				{slots.map((slot, idx) => {
					const state = results[slot.id];
					const label = blind
						? `Model ${String.fromCharCode(65 + idx)}`
						: slot.model || `Slot ${idx + 1}`;
					return (
						<div key={slot.id} className="flex flex-col gap-2 min-h-0">
							<div className="flex items-center gap-2">
								<span className="text-xs font-medium text-muted-foreground">{label}</span>
								{state && !state.done && (
									<span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
								)}
							</div>
							<div className="flex-1 rounded-lg border bg-muted/20 p-3 text-sm overflow-auto">
								{!state && <span className="text-muted-foreground text-xs">Waiting…</span>}
								{state?.error && <span className="text-destructive text-xs">{state.error}</span>}
								{state?.text && (
									<div className={cn("prose prose-sm dark:prose-invert max-w-none")}>
										<ReactMarkdown remarkPlugins={[remarkGfm]}>{state.text}</ReactMarkdown>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function SlotPicker({
	slot,
	label,
	endpoints,
	onChange,
	onRemove,
}: {
	slot: Slot;
	label?: string;
	endpoints: Array<{ id: string; name: string }>;
	onChange: (patch: Partial<Slot>) => void;
	onRemove?: () => void;
}) {
	const [models, setModels] = useState<string[]>([]);

	const loadModels = async (endpointId: string) => {
		try {
			const list = await getEndpointModels({ data: { endpointId } });
			setModels(list);
		} catch {
			setModels([]);
		}
	};

	return (
		<div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
			{label && <span className="text-xs font-medium text-muted-foreground mr-1">{label}</span>}
			<select
				value={slot.endpointId}
				onChange={(e) => {
					onChange({ endpointId: e.target.value, model: "" });
					loadModels(e.target.value);
				}}
				onFocus={() => slot.endpointId && loadModels(slot.endpointId)}
				className="bg-transparent text-xs outline-none cursor-pointer"
				aria-label="Select endpoint"
			>
				<option value="">Endpoint…</option>
				{endpoints.map((ep) => (
					<option key={ep.id} value={ep.id}>
						{ep.name}
					</option>
				))}
			</select>
			<select
				value={slot.model}
				onChange={(e) => onChange({ model: e.target.value })}
				className="bg-transparent text-xs outline-none cursor-pointer max-w-40 truncate"
				aria-label="Select model"
			>
				<option value="">Model…</option>
				{models.map((m) => (
					<option key={m} value={m}>
						{m}
					</option>
				))}
			</select>
			{onRemove && (
				<button
					type="button"
					onClick={onRemove}
					className="ml-1 text-muted-foreground hover:text-foreground"
					aria-label="Remove slot"
				>
					<XIcon size={11} />
				</button>
			)}
		</div>
	);
}
