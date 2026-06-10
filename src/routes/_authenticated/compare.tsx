import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { Textarea } from "#/components/ui/textarea";
import { endpointsQueryOptions } from "#/features/chat/lib/chat.functions";
import { CompareResults } from "#/features/compare/components/CompareResults";
import { SlotPicker } from "#/features/compare/components/SlotPicker";
import { useCompareStream } from "#/features/compare/hooks/use-compare-stream";
import { nextSlotId, type Slot } from "#/features/compare/lib/types";

export const Route = createFileRoute("/_authenticated/compare")({
	component: ComparePage,
});

function ComparePage() {
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());
	const firstEndpointId = endpoints[0]?.id ?? "";

	const [slots, setSlots] = useState<Slot[]>(() => [
		{ id: nextSlotId(), endpointId: firstEndpointId, model: "" },
		{ id: nextSlotId(), endpointId: firstEndpointId, model: "" },
	]);
	const [prompt, setPrompt] = useState("");
	const [isBlind, setIsBlind] = useState(false);
	const { results, isStreaming, run, stop } = useCompareStream();

	const hasResults = Object.keys(results).length > 0;

	const updateSlot = (id: number, patch: Partial<Slot>) =>
		setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

	const addSlot = () => {
		if (slots.length >= 4) return;
		setSlots((prev) => [...prev, { id: nextSlotId(), endpointId: firstEndpointId, model: "" }]);
	};

	const removeSlot = (id: number) => {
		if (slots.length <= 2) return;
		setSlots((prev) => prev.filter((s) => s.id !== id));
	};

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Model Compare"
				description="Run the same prompt across multiple models side by side."
				actions={
					<Button
						variant="outline"
						size="sm"
						className="gap-1.5"
						onClick={() => setIsBlind((b) => !b)}
						disabled={!hasResults}
					>
						{isBlind ? <EyeIcon size={13} /> : <EyeOffIcon size={13} />}
						{isBlind ? "Reveal" : "Blind"}
					</Button>
				}
			/>

			<div className="shrink-0 space-y-3 border-b px-4 py-3">
				<div className="flex flex-wrap items-end gap-2">
					{slots.map((slot, idx) => (
						<SlotPicker
							key={slot.id}
							slot={slot}
							label={isBlind ? `Model ${String.fromCharCode(65 + idx)}` : undefined}
							endpoints={endpoints}
							onChange={(patch) => updateSlot(slot.id, patch)}
							onRemove={slots.length > 2 ? () => removeSlot(slot.id) : undefined}
						/>
					))}
					{slots.length < 4 && (
						<Button variant="outline" size="sm" onClick={addSlot} className="shrink-0 gap-1">
							<PlusIcon size={12} />
							Add
						</Button>
					)}
				</div>
				<div className="flex gap-2">
					<Textarea
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
								e.preventDefault();
								run(slots, prompt);
							}
						}}
						placeholder="Enter prompt… (Ctrl+Enter to run)"
						rows={2}
						className="flex-1 resize-none"
					/>
					{isStreaming ? (
						<Button variant="outline" onClick={stop} className="shrink-0 self-end">
							Stop
						</Button>
					) : (
						<Button
							onClick={() => run(slots, prompt)}
							disabled={!prompt.trim() || slots.some((s) => !s.model)}
							className="shrink-0 self-end"
						>
							Compare
						</Button>
					)}
				</div>
			</div>

			<CompareResults slots={slots} results={results} isBlind={isBlind} />
		</div>
	);
}
