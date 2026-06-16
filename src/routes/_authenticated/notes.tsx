import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { NoteForm } from "#/features/notes/components/NoteForm";
import { NoteGroup } from "#/features/notes/components/NoteGroup";
import { useNotes } from "#/features/notes/hooks/use-notes";
import type { NoteFormData } from "#/features/notes/lib/types";

export const Route = createFileRoute("/_authenticated/notes")({
	component: NotesPage,
});

function NotesPage() {
	const { notes, createNote, updateNote, deleteNote } = useNotes();
	const [isCreating, setIsCreating] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	const pinnedNotes = notes.filter((n) => n.pinned);
	const unpinnedNotes = notes.filter((n) => !n.pinned);

	function handleUpdate(id: string, formData: Partial<NoteFormData>) {
		updateNote.mutate({ id, ...formData }, { onSuccess: () => setEditingId(null) });
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Notes"
				description={`${notes.length} note${notes.length !== 1 ? "s" : ""}`}
				actions={
					<Button size="sm" className="gap-1.5" onClick={() => setIsCreating(true)}>
						<PlusIcon size={13} />
						New note
					</Button>
				}
			/>

			<div className="flex-1 overflow-auto p-4">
				{isCreating && (
					<div className="mb-4">
						<NoteForm
							isPending={createNote.isPending}
							onSave={(formData) =>
								createNote.mutate(formData, { onSuccess: () => setIsCreating(false) })
							}
							onCancel={() => setIsCreating(false)}
						/>
					</div>
				)}

				{notes.length === 0 && !isCreating && (
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-muted-foreground">
							No notes yet. Click "New note" to start.
						</p>
					</div>
				)}

				{pinnedNotes.length > 0 && (
					<NoteGroup
						label="Pinned"
						notes={pinnedNotes}
						editingId={editingId}
						isUpdatePending={updateNote.isPending}
						onEdit={setEditingId}
						onUpdate={handleUpdate}
						onDelete={(id) => deleteNote.mutate(id)}
					/>
				)}
				{unpinnedNotes.length > 0 && (
					<NoteGroup
						label={pinnedNotes.length > 0 ? "Others" : undefined}
						notes={unpinnedNotes}
						editingId={editingId}
						isUpdatePending={updateNote.isPending}
						onEdit={setEditingId}
						onUpdate={handleUpdate}
						onDelete={(id) => deleteNote.mutate(id)}
					/>
				)}
			</div>
		</div>
	);
}
