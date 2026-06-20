import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/components/ui/item";
import {
	deleteSavedMemory,
	savedMemoriesQueryOptions,
} from "#/features/settings/lib/memory.functions";

export function MemoryTab() {
	const queryClient = useQueryClient();
	const { data: memories } = useSuspenseQuery(savedMemoriesQueryOptions());

	const remove = useMutation({
		mutationFn: (id: string) => deleteSavedMemory({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["saved-memories"] });
			toast.success("Memory deleted");
		},
		onError: () => toast.error("Failed to delete memory"),
	});

	return (
		<div className="space-y-6">
			<p className="text-sm text-muted-foreground">
				The assistant saves and recalls these when you enable Memory in a chat's tools.
			</p>

			<section className="space-y-3">
				<h2 className="text-sm font-medium">Saved memories</h2>
				{memories.length === 0 ? (
					<p className="text-sm text-muted-foreground">No memories saved yet.</p>
				) : (
					<ItemGroup>
						{memories.map((memory) => (
							<Item key={memory.id} variant="outline">
								<ItemContent>
									<ItemTitle>{memory.text}</ItemTitle>
									<ItemDescription>
										{memory.category} · {memory.source}
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 text-destructive hover:text-destructive"
										onClick={() => remove.mutate(memory.id)}
										aria-label="Delete memory"
									>
										<TrashIcon size={13} />
									</Button>
								</ItemActions>
							</Item>
						))}
					</ItemGroup>
				)}
			</section>
		</div>
	);
}
