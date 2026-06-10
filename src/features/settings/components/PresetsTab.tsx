import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import {
	createPreset,
	deletePreset,
	presetsQueryOptions,
} from "#/features/chat/lib/preset.functions";

export function PresetsTab() {
	const queryClient = useQueryClient();
	const { data: presets = [] } = useQuery(presetsQueryOptions());
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [systemPrompt, setSystemPrompt] = useState("");

	const createMutation = useMutation({
		mutationFn: () =>
			createPreset({
				data: {
					name: name.trim(),
					description: description.trim() || undefined,
					systemPrompt: systemPrompt.trim(),
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["chat-presets"] });
			setName("");
			setDescription("");
			setSystemPrompt("");
			toast.success("Preset saved");
		},
		onError: (e) => toast.error((e as Error).message),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deletePreset({ data: { id } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-presets"] }),
		onError: (e) => toast.error((e as Error).message),
	});

	return (
		<div className="space-y-6">
			<section>
				<h2 className="mb-3 text-sm font-medium">New preset</h2>
				<div className="space-y-2">
					<Input placeholder="Preset name" value={name} onChange={(e) => setName(e.target.value)} />
					<Input
						placeholder="Description (optional)"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
					<Textarea
						value={systemPrompt}
						onChange={(e) => setSystemPrompt(e.target.value)}
						placeholder="System prompt…"
						rows={4}
						className="resize-none"
					/>
					<Button
						onClick={() => createMutation.mutate()}
						disabled={!name.trim() || !systemPrompt.trim() || createMutation.isPending}
						size="sm"
					>
						Save preset
					</Button>
				</div>
			</section>
			{presets.length > 0 && (
				<section>
					<h2 className="mb-3 text-sm font-medium">Saved presets</h2>
					<div className="space-y-2">
						{presets.map((p) => (
							<Card key={p.id} size="sm">
								<CardContent className="flex items-start gap-3">
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium">{p.name}</div>
										{p.description && (
											<div className="text-xs text-muted-foreground">{p.description}</div>
										)}
										<div className="mt-1 truncate text-xs text-muted-foreground">
											{p.systemPrompt.slice(0, 100)}
											{p.systemPrompt.length > 100 ? "…" : ""}
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
										onClick={() => deleteMutation.mutate(p.id)}
										aria-label="Delete preset"
									>
										<TrashIcon size={13} />
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
