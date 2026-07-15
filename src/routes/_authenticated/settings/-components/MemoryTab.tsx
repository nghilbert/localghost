import { revalidateLogic } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PencilIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/shared/components/ui/alert-dialog";
import { Button } from "#/shared/components/ui/button";
import { Input } from "#/shared/components/ui/input";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/shared/components/ui/item";
import { memoriesQueryOptions } from "#/shared/domain/memory/memory.functions";
import { memoryTextInput } from "#/shared/domain/memory/schemas";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { useMemories } from "../-hooks/use-memories";
import { MemoryEditForm } from "./MemoryEditForm";

export function MemoryTab() {
	const { data: memories } = useSuspenseQuery(memoriesQueryOptions());
	const { createMemoryMutation, deleteMemoryMutation } = useMemories();
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

	const form = useAppForm({
		defaultValues: { text: "" },
		validators: { onDynamic: memoryTextInput },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			await createMemoryMutation.mutate(value.text.trim());
			form.reset();
		},
	});

	function confirmDelete(id: string) {
		deleteMemoryMutation.mutate(id);
		setPendingDeleteId(null);
	}

	return (
		<div className="space-y-6">
			<p className="text-sm text-muted-foreground">
				The assistant saves and recalls these when you enable Memory in a chat's tools.
			</p>

			<form.AppForm>
				<form.SubmitForm className="gap-3">
					<form.AppField name="text">
						{(field) => (
							<field.InputField
								label="New memory"
								placeholder="e.g. I prefer metric units"
								fieldOrientation="vertical"
							/>
						)}
					</form.AppField>
					<form.SubmitButton size="sm" className="self-start">
						Add memory
					</form.SubmitButton>
				</form.SubmitForm>
			</form.AppForm>

			<section className="space-y-3">
				<h2 className="text-sm font-medium">Saved memories</h2>
				{memories.length > 0 && (
					<Input
						type="search"
						placeholder="Search memories"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						data-testid="memory-search-input"
					/>
				)}
				{memories.length === 0 ? (
					<p className="text-sm text-muted-foreground">No memories saved yet.</p>
				) : visibleMemories.length === 0 ? (
					<p className="text-sm text-muted-foreground">No memories match your search.</p>
				) : (
					<ItemGroup>
						{visibleMemories.map((memory) => (
							<Item key={memory.id} variant="outline">
								{editingId === memory.id ? (
									<MemoryEditForm memory={memory} onDone={() => setEditingId(null)} />
								) : (
									<ItemContent>
										<ItemTitle>{memory.text}</ItemTitle>
										<ItemDescription>
											{memory.category} · {memory.source}
										</ItemDescription>
									</ItemContent>
								)}
								<ItemActions>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6"
										onClick={() => setEditingId(memory.id)}
										aria-label="Edit memory"
										data-testid="memory-edit-button"
									>
										<PencilIcon size={13} />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 text-destructive hover:text-destructive"
										onClick={() => setPendingDeleteId(memory.id)}
										aria-label="Delete memory"
										data-testid="memory-delete-button"
									>
										<TrashIcon size={13} />
									</Button>
								</ItemActions>
							</Item>
						))}
					</ItemGroup>
				)}
			</section>

			<AlertDialog
				open={pendingDeleteId !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDeleteId(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this memory?</AlertDialogTitle>
						<AlertDialogDescription>
							"{pendingDelete?.text}" will be permanently deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								if (pendingDeleteId) confirmDelete(pendingDeleteId);
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
