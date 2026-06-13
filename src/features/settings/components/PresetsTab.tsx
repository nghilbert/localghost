import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/components/ui/item";
import { CreatePresetForm } from "#/features/chat/components/CreatePresetForm";
import { deletePreset, presetsQueryOptions } from "#/features/chat/lib/preset.functions";

export function PresetsTab() {
	const queryClient = useQueryClient();
	const { data: presets = [] } = useQuery(presetsQueryOptions());

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deletePreset({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["chat-presets"] });
			toast.success("Preset deleted");
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>New preset</CardTitle>
				</CardHeader>
				<CardContent>
					<CreatePresetForm />
				</CardContent>
			</Card>
			{presets.length > 0 && (
				<ItemGroup>
					{presets.map((p) => (
						<Item key={p.id} variant="outline">
							<ItemContent>
								<ItemTitle>{p.name}</ItemTitle>
								{p.description && <ItemDescription>{p.description}</ItemDescription>}
								<ItemDescription>
									{p.systemPrompt.slice(0, 100)}
									{p.systemPrompt.length > 100 ? "…" : ""}
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
									onClick={() => deleteMutation.mutate(p.id)}
									aria-label="Delete preset"
								>
									<TrashIcon size={13} />
								</Button>
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			)}
		</div>
	);
}
