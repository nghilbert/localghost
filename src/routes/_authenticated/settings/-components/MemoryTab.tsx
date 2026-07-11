import { useSuspenseQuery } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import { memoriesQueryOptions } from "#/entities/memory/memory.functions";
import { Button } from "#/shared/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/shared/ui/item";
import { useMemories } from "../-hooks/use-memories";

export function MemoryTab() {
	const { data: memories } = useSuspenseQuery(memoriesQueryOptions());
	const { deleteMemoryMutation } = useMemories();

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
										onClick={() => deleteMemoryMutation.mutate(memory.id)}
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
