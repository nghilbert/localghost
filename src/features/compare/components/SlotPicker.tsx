import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { NativeSelect, NativeSelectOption } from "#/components/ui/native-select";
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
			<NativeSelect
				value={slot.endpointId}
				onChange={(e) => onChange({ endpointId: e.target.value, model: "" })}
				size="sm"
				aria-label="Select endpoint"
			>
				<NativeSelectOption value="">Endpoint…</NativeSelectOption>
				{endpoints.map((ep) => (
					<NativeSelectOption key={ep.id} value={ep.id}>
						{ep.name}
					</NativeSelectOption>
				))}
			</NativeSelect>
			<NativeSelect
				value={slot.model}
				onChange={(e) => onChange({ model: e.target.value })}
				size="sm"
				className="max-w-44"
				aria-label="Select model"
			>
				<NativeSelectOption value="">Model…</NativeSelectOption>
				{models.map((m) => (
					<NativeSelectOption key={m} value={m}>
						{m}
					</NativeSelectOption>
				))}
			</NativeSelect>
			{onRemove && (
				<Button
					variant="ghost"
					size="icon"
					className="ml-1 h-6 w-6 text-muted-foreground"
					onClick={onRemove}
					aria-label="Remove slot"
				>
					✕
				</Button>
			)}
		</div>
	);
}
