import { useQuery } from "@tanstack/react-query";
import { EyeIcon, EyeOffIcon, PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Textarea } from "#/components/ui/textarea";
import { CompareResults } from "#/features/compare/components/CompareResults";
import { SlotPicker } from "#/features/compare/components/SlotPicker";
import { useCompareSlot } from "#/features/compare/hooks/use-compare";
import {
	createCompareConversation,
	deleteCompareConversation,
} from "#/features/compare/lib/compare.functions";
import { nextSlotId, type Slot } from "#/features/compare/lib/types";
import { endpointsQueryOptions } from "#/features/endpoints/lib/endpoint.functions";

const MAX_SLOTS = 4;
const EMPTY_SLOT: Slot = { id: -1, endpointId: "", model: "", conversationId: null };

function newSlot(endpointId: string): Slot {
	return { id: nextSlotId(), endpointId, model: "", conversationId: null };
}

export function CompareTab() {
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());
	const firstEndpointId = endpoints[0]?.id ?? "";

	const [slots, setSlots] = useState<Slot[]>(() => [
		newSlot(firstEndpointId),
		newSlot(firstEndpointId),
	]);
	const [prompt, setPrompt] = useState("");
	const [isBlind, setIsBlind] = useState(false);
	const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

	// Always call 4 hooks (stable hook count); unused positions get a dummy slot.
	const s0 = useCompareSlot(slots[0] ?? EMPTY_SLOT);
	const s1 = useCompareSlot(slots[1] ?? EMPTY_SLOT);
	const s2 = useCompareSlot(slots[2] ?? EMPTY_SLOT);
	const s3 = useCompareSlot(slots[3] ?? EMPTY_SLOT);
	const slotChats = [s0, s1, s2, s3].slice(0, slots.length);

	const isStreaming = slotChats.some(
		(sc) => sc.status === "submitted" || sc.status === "streaming",
	);

	// Phase 2: once all slots have conversationIds and there's a pending prompt, fire.
	useEffect(() => {
		if (!pendingPrompt) return;
		const allReady = slots.every((s) => s.conversationId !== null);
		if (!allReady) return;
		const msg = pendingPrompt;
		setPendingPrompt(null);
		void Promise.all(slotChats.map((sc) => sc.sendMessage(msg)));
	}, [pendingPrompt, slots, slotChats]);

	// Track previous slot conversationIds so we can clean up on model/endpoint change.
	const prevConversationIds = useRef<Map<number, string>>(new Map());

	const updateSlot = async (id: number, patch: Partial<Slot>) => {
		const slot = slots.find((s) => s.id === id);
		if (!slot) return;

		// If endpoint or model changed, delete the old conversation so the next run
		// creates a fresh one with the correct config.
		const resetConversation =
			("endpointId" in patch && patch.endpointId !== slot.endpointId) ||
			("model" in patch && patch.model !== slot.model);

		if (resetConversation && slot.conversationId) {
			await deleteCompareConversation({ data: { id: slot.conversationId } }).catch(() => {});
		}

		setSlots((prev) =>
			prev.map((s) =>
				s.id === id
					? { ...s, ...patch, conversationId: resetConversation ? null : s.conversationId }
					: s,
			),
		);
	};

	const addSlot = () => {
		if (slots.length >= MAX_SLOTS) return;
		setSlots((prev) => [...prev, newSlot(firstEndpointId)]);
	};

	const removeSlot = async (id: number) => {
		if (slots.length <= 2) return;
		const slot = slots.find((s) => s.id === id);
		if (slot?.conversationId) {
			await deleteCompareConversation({ data: { id: slot.conversationId } }).catch(() => {});
		}
		setSlots((prev) => prev.filter((s) => s.id !== id));
	};

	// Phase 1: create any missing conversations, then set pendingPrompt to trigger Phase 2.
	const handleCompare = async () => {
		if (!prompt.trim() || slots.some((s) => !s.model)) return;

		// Create conversations for slots that haven't been assigned one yet.
		const updatedSlots = await Promise.all(
			slots.map(async (slot) => {
				if (slot.conversationId) return slot;
				const conv = await createCompareConversation({
					data: { endpointId: slot.endpointId, model: slot.model },
				});
				prevConversationIds.current.set(slot.id, conv.id);
				return { ...slot, conversationId: conv.id };
			}),
		);

		setSlots(updatedSlots);
		setPendingPrompt(prompt);
	};

	const handleStop = () => {
		for (const sc of slotChats) sc.stop();
	};

	const hasResults = slotChats.some((sc) => sc.messages.length > 0);

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="shrink-0 space-y-3 border-b px-4 py-3">
				<div className="flex flex-wrap items-end gap-2">
					{slots.map((slot, idx) => (
						<SlotPicker
							key={slot.id}
							slot={slot}
							label={isBlind ? `Model ${String.fromCharCode(65 + idx)}` : undefined}
							endpoints={endpoints}
							onChange={(patch) => void updateSlot(slot.id, patch)}
							onRemove={slots.length > 2 ? () => void removeSlot(slot.id) : undefined}
						/>
					))}
					{slots.length < MAX_SLOTS && (
						<Button variant="outline" size="sm" onClick={addSlot} className="shrink-0 gap-1">
							<PlusIcon size={12} />
							Add
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						className="ml-auto shrink-0 gap-1.5"
						onClick={() => setIsBlind((b) => !b)}
						disabled={!hasResults}
					>
						{isBlind ? <EyeIcon size={13} /> : <EyeOffIcon size={13} />}
						{isBlind ? "Reveal" : "Blind"}
					</Button>
				</div>
				<div className="flex gap-2">
					<Textarea
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
								e.preventDefault();
								void handleCompare();
							}
						}}
						placeholder="Enter prompt… (Ctrl+Enter to run)"
						rows={2}
						className="flex-1 resize-none"
					/>
					{isStreaming ? (
						<Button variant="outline" onClick={handleStop} className="shrink-0 self-end">
							Stop
						</Button>
					) : (
						<Button
							onClick={() => void handleCompare()}
							disabled={!prompt.trim() || slots.some((s) => !s.model)}
							className="shrink-0 self-end"
						>
							Compare
						</Button>
					)}
				</div>
			</div>

			<CompareResults slots={slots} slotChats={slotChats} isBlind={isBlind} />
		</div>
	);
}
