import { useSuspenseQuery } from "@tanstack/react-query";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ConfirmDeleteDialog } from "#/components/layout/ConfirmDeleteDialog";
import { SettingsSection } from "#/components/layout/SettingsSection";
import { Button } from "#/components/ui/button";
import { Empty } from "#/components/ui/empty";
import { Input } from "#/components/ui/input";
import { Item } from "#/components/ui/item";
import { useDeleteMemory } from "#/features/memory/hooks/use-delete-memory";
import { memoryQueries } from "#/features/memory/memory.queries";
import { MemoryCreateForm } from "./MemoryCreateForm";
import { MemoryEditForm } from "./MemoryEditForm";

/** The saved memories, with add, edit, and delete. */
export function MemoryTab() {
	const { data: memories } = useSuspenseQuery(memoryQueries.list());
	const deleteMemory = useDeleteMemory();
	const [search, setSearch] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

	const pendingDelete = memories.find((memory) => memory.id === pendingDeleteId);
	const query = search.trim().toLowerCase();
	const visibleMemories = query
		? memories.filter(
				(memory) =>
					memory.text.toLowerCase().includes(query) ||
					memory.category.toLowerCase().includes(query),
			)
		: memories;

	function confirmDelete(id: string) {
		deleteMemory.mutate(id, { onSuccess: () => setPendingDeleteId(null) });
	}

	return (
		<>
			<SettingsSection
				title="Memory"
				description="Facts the assistant saves during chats and recalls when they're relevant."
			>
				<MemoryCreateForm />
			</SettingsSection>

			<SettingsSection title="Saved memories">
				{memories.length > 0 && (
					<Input
						type="search"
						aria-label="Search memories"
						placeholder="Search memories"
						value={search}
						onValueChange={setSearch}
					/>
				)}
				{memories.length === 0 ? (
					<Empty.Root>
						<Empty.Title>No memories yet</Empty.Title>
						<Empty.Description>
							Add one above, or let the assistant save them in chat.
						</Empty.Description>
					</Empty.Root>
				) : visibleMemories.length === 0 ? (
					<Empty.Root>
						<Empty.Title>No memories match your search</Empty.Title>
					</Empty.Root>
				) : (
					<Item.Group render={<ul />}>
						{visibleMemories.map((memory) => (
							<Item.Root key={memory.id} variant="outlined" render={<li />}>
								<Item.Content>
									{editingId === memory.id ? (
										<MemoryEditForm memory={memory} onDone={() => setEditingId(null)} />
									) : (
										<>
											<Item.Title>{memory.text}</Item.Title>
											<Item.Description>
												{memory.category} · {memory.source}
											</Item.Description>
										</>
									)}
								</Item.Content>
								<Item.Actions>
									<Button
										color="neutral"
										variant="quiet"
										size="sm"
										iconOnly
										onClick={() => setEditingId(memory.id)}
										aria-label="Edit memory"
									>
										<PencilIcon />
									</Button>
									<Button
										color="neutral"
										variant="quiet"
										size="sm"
										iconOnly
										onClick={() => setPendingDeleteId(memory.id)}
										aria-label="Delete memory"
									>
										<Trash2Icon />
									</Button>
								</Item.Actions>
							</Item.Root>
						))}
					</Item.Group>
				)}
			</SettingsSection>

			<ConfirmDeleteDialog
				open={pendingDeleteId !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDeleteId(null);
				}}
				title="Delete this memory?"
				description={`"${pendingDelete?.text}" will be permanently deleted.`}
				isPending={deleteMemory.isPending}
				onConfirm={() => {
					if (pendingDeleteId) confirmDelete(pendingDeleteId);
				}}
			/>
		</>
	);
}
