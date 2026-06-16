import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	createNote,
	deleteNote,
	notesQueryOptions,
	updateNote,
} from "#/features/notes/lib/note.functions";
import type { NoteFormData } from "#/features/notes/lib/types";

/**
 * Owns the notes list query plus create/update/delete mutations with cache
 * invalidation and result toasts. Components keep their own UI state and can
 * pass per-call `onSuccess` callbacks to react to a settled mutation.
 */
export function useNotes() {
	const queryClient = useQueryClient();
	const { data: notes = [] } = useQuery(notesQueryOptions());
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notes"] });

	const createMutation = useMutation({
		mutationFn: (data: NoteFormData) => createNote({ data }),
		onSuccess: () => {
			invalidate();
			toast.success("Note created");
		},
		onError: () => toast.error("Failed to create note"),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, ...patch }: { id: string } & Partial<NoteFormData>) =>
			updateNote({ data: { id, ...patch } }),
		onSuccess: () => invalidate(),
		onError: () => toast.error("Failed to save note"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteNote({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Note deleted");
		},
		onError: () => toast.error("Failed to delete note"),
	});

	return {
		notes,
		createNote: createMutation,
		updateNote: updateMutation,
		deleteNote: deleteMutation,
	};
}
