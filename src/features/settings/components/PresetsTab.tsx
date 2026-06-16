import { TrashIcon } from "lucide-react";
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
import { usePresets } from "#/features/chat/hooks/use-presets";

export function PresetsTab() {
	const { presets, deletePreset } = usePresets();

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
									onClick={() => deletePreset.mutate(p.id)}
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
