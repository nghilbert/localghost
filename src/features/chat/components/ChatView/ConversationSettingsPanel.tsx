import { useState } from "react";
import { Field, FieldLabel } from "#/components/ui/field";
import { Slider } from "#/components/ui/slider";
import { Textarea } from "#/components/ui/textarea";

type ConversationSettingsPanelProps = {
	initialSystemPrompt: string;
	initialTemperature: number;
	onPatch: (patch: { systemPrompt?: string | null; temperature?: number }) => void;
};

export function ConversationSettingsPanel({
	initialSystemPrompt,
	initialTemperature,
	onPatch,
}: ConversationSettingsPanelProps) {
	const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
	const [temperature, setTemperature] = useState(initialTemperature);

	return (
		<div className="border-t bg-muted/30 px-4 py-3">
			<div className="flex flex-col gap-3 md:flex-row md:gap-6">
				<Field className="flex-1 gap-1">
					<FieldLabel htmlFor="system-prompt" className="text-xs text-muted-foreground">
						System prompt
					</FieldLabel>
					<Textarea
						id="system-prompt"
						value={systemPrompt}
						onChange={(e) => setSystemPrompt(e.target.value)}
						onBlur={() => onPatch({ systemPrompt: systemPrompt || null })}
						placeholder="You are a helpful assistant…"
						rows={2}
						className="resize-none text-xs"
					/>
				</Field>
				<Field className="w-full gap-1 md:w-40">
					<FieldLabel htmlFor="temperature" className="text-xs text-muted-foreground">
						Temperature: {temperature.toFixed(1)}
					</FieldLabel>
					<Slider
						id="temperature"
						min={0}
						max={2}
						step={0.1}
						value={[temperature]}
						onValueChange={([value]) => setTemperature(value ?? temperature)}
						onValueCommit={([value]) => onPatch({ temperature: value ?? temperature })}
						className="w-full"
					/>
					<div className="flex justify-between text-[10px] text-muted-foreground">
						<span>Precise</span>
						<span>Creative</span>
					</div>
				</Field>
			</div>
		</div>
	);
}
