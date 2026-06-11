import { Markdown } from "#/components/Markdown";
import { cn } from "#/lib/utils";
import type { Slot, SlotState } from "../lib/types";

type CompareResultsProps = {
	slots: Slot[];
	results: Record<number, SlotState>;
	isBlind: boolean;
};

export function CompareResults({ slots, results, isBlind }: CompareResultsProps) {
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
					const state = results[slot.id];
					const label = isBlind
						? `Model ${String.fromCharCode(65 + idx)}`
						: slot.model || `Slot ${idx + 1}`;
					return (
						<div key={slot.id} className="flex min-h-48 flex-col gap-2">
							<div className="flex items-center gap-2">
								<span className="text-xs font-medium text-muted-foreground">{label}</span>
								{state && !state.done && (
									<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
								)}
							</div>
							<div className="flex-1 overflow-auto rounded-xl border bg-muted/20 p-4 text-sm">
								{!state && <span className="text-xs text-muted-foreground">Waiting…</span>}
								{state?.error && <span className="text-xs text-destructive">{state.error}</span>}
								{state?.text && <Markdown content={state.text} />}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
