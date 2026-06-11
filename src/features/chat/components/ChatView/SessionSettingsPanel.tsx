import { useMutation, useQuery } from "@tanstack/react-query";
import { BookmarkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Field, FieldLabel } from "#/components/ui/field";
import { Slider } from "#/components/ui/slider";
import { Textarea } from "#/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { createPreset, presetsQueryOptions } from "#/features/chat/lib/preset.functions";

type SessionSettingsPanelProps = {
	sessionModel: string;
	initialSystemPrompt: string;
	initialTemperature: number;
	onPatchSession: (patch: { systemPrompt?: string | null; temperature?: number }) => void;
};

export function SessionSettingsPanel({
	sessionModel,
	initialSystemPrompt,
	initialTemperature,
	onPatchSession,
}: SessionSettingsPanelProps) {
	const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
	const [temperature, setTemperature] = useState(initialTemperature);

	const { data: presets = [] } = useQuery(presetsQueryOptions());

	const savePresetMutation = useMutation({
		mutationFn: (name: string) =>
			createPreset({ data: { name, systemPrompt, temperature, model: sessionModel } }),
		onSuccess: () => toast.success("Preset saved"),
		onError: (error) => toast.error(`Failed to save preset: ${error.message}`),
	});

	return (
		<div className="border-t bg-muted/30 px-4 py-3">
			{presets.length > 0 && (
				<div className="mb-3 flex items-center gap-2">
					<span className="text-xs text-muted-foreground">Load preset:</span>
					<div className="flex flex-wrap gap-1">
						{presets.map((preset) => (
							<Button
								key={preset.id}
								variant="outline"
								size="sm"
								className="h-auto px-2 py-0.5 text-xs"
								onClick={() => {
									setSystemPrompt(preset.systemPrompt);
									if (preset.temperature !== null) setTemperature(preset.temperature);
									onPatchSession({
										systemPrompt: preset.systemPrompt,
										...(preset.temperature !== null ? { temperature: preset.temperature } : {}),
									});
								}}
							>
								{preset.name}
							</Button>
						))}
					</div>
				</div>
			)}
			<div className="flex flex-col gap-3 md:flex-row md:gap-6">
				<Field className="flex-1 gap-1">
					<div className="flex items-center justify-between">
						<FieldLabel htmlFor="system-prompt" className="text-xs text-muted-foreground">
							System prompt
						</FieldLabel>
						{systemPrompt.trim() && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-auto gap-0.5 px-1 py-0 text-[10px] text-muted-foreground"
										onClick={() => {
											const name = prompt("Preset name:");
											if (name?.trim()) savePresetMutation.mutate(name.trim());
										}}
										aria-label="Save as preset"
									>
										<BookmarkIcon size={11} />
										Save
									</Button>
								</TooltipTrigger>
								<TooltipContent>Save as preset</TooltipContent>
							</Tooltip>
						)}
					</div>
					<Textarea
						id="system-prompt"
						value={systemPrompt}
						onChange={(e) => setSystemPrompt(e.target.value)}
						onBlur={() => onPatchSession({ systemPrompt: systemPrompt || null })}
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
						onValueCommit={([value]) => onPatchSession({ temperature: value ?? temperature })}
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
