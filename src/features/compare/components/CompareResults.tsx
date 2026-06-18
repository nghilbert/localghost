import { Markdown } from "#/components/Markdown";
import { partsText } from "#/features/chat/lib/message-text";
import { cn } from "#/lib/utils";
import type { useCompareSlot } from "../hooks/use-compare";
import type { Slot } from "../lib/types";

type SlotChat = ReturnType<typeof useCompareSlot>;

type CompareResultsProps = {
	slots: Slot[];
	slotChats: SlotChat[];
	isBlind: boolean;
};

export function CompareResults({ slots, slotChats, isBlind }: CompareResultsProps) {
	return (
		<div className="flex-1 overflow-auto p-4">
			<div
				className={cn(
					"h-full gap-3",
					slots.length <= 2
						? "grid grid-cols-1 md:grid-cols-2"
						: slots.length === 3
							? "grid grid-cols-1 md:grid-cols-3"
							: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
				)}
			>
				{slots.map((slot, idx) => {
					const chat = slotChats[idx];
					const label = isBlind
						? `Model ${String.fromCharCode(65 + idx)}`
						: slot.model || `Slot ${idx + 1}`;
					const isStreaming = chat?.status === "submitted" || chat?.status === "streaming";
					const assistantMessages = chat?.messages.filter((m) => m.role === "assistant") ?? [];
					const lastAssistant = assistantMessages[assistantMessages.length - 1];
					const text = lastAssistant ? partsText(lastAssistant.parts) : "";
					const hasMessages = (chat?.messages.length ?? 0) > 0;

					return (
						<div key={slot.id} className="flex min-h-48 flex-col gap-2">
							<div className="flex items-center gap-2">
								<span className="text-xs font-medium text-muted-foreground">{label}</span>
								{isStreaming && (
									<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
								)}
							</div>
							<div className="flex-1 overflow-auto rounded-xl border bg-muted/20 p-4 text-sm">
								{!hasMessages && <span className="text-xs text-muted-foreground">Waiting…</span>}
								{text && <Markdown content={text} />}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
