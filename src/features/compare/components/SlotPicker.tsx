import { useEffect, useState } from "react";
import { getEndpointModels } from "#/features/chat/lib/chat.functions";
import type { Slot } from "../lib/types";

type SlotPickerProps = {
	slot: Slot;
	label?: string;
	endpoints: Array<{ id: string; name: string }>;
	onChange: (patch: Partial<Slot>) => void;
	onRemove?: () => void;
};

export function SlotPicker({ slot, label, endpoints, onChange, onRemove }: SlotPickerProps) {
	const [models, setModels] = useState<string[]>([]);

	useEffect(() => {
		if (!slot.endpointId) return;
		getEndpointModels({ data: { endpointId: slot.endpointId } })
			.then(setModels)
			.catch(() => setModels([]));
	}, [slot.endpointId]);

	return (
		<div className="flex items-center gap-1 rounded-lg border bg-background px-2 py-1.5">
			{label && <span className="mr-1 text-xs font-medium text-muted-foreground">{label}</span>}
			<select
				value={slot.endpointId}
				onChange={(e) => onChange({ endpointId: e.target.value, model: "" })}
				className="cursor-pointer bg-transparent text-xs outline-none"
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
				className="max-w-40 cursor-pointer truncate bg-transparent text-xs outline-none"
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
					✕
				</button>
			)}
		</div>
	);
}
