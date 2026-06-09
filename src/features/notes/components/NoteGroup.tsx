import type { Note } from "#/features/notes/lib/types";
import type { NoteFormData } from "#/features/notes/lib/use-note-form";
import { NoteCard } from "./NoteCard";
import { NoteForm } from "./NoteForm";

type NoteGroupProps = {
	label?: string;
	notes: Note[];
	editingId: string | null;
	isUpdatePending: boolean;
	onEdit: (id: string | null) => void;
	onUpdate: (id: string, formData: Partial<NoteFormData>) => void;
	onDelete: (id: string) => void;
};

export function NoteGroup({
	label,
	notes,
	editingId,
	isUpdatePending,
	onEdit,
	onUpdate,
	onDelete,
}: NoteGroupProps) {
	return (
		<section className="mb-6">
			{label && (
				<p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{label}
				</p>
			)}
			<div className="columns-1 gap-3 sm:columns-2 md:columns-3 lg:columns-4">
				{notes.map((note) =>
					editingId === note.id ? (
						<div key={note.id} className="mb-3 break-inside-avoid">
							<NoteForm
								initial={note}
								isPending={isUpdatePending}
								onSave={(formData) => onUpdate(note.id, formData)}
								onCancel={() => onEdit(null)}
							/>
						</div>
					) : (
						<NoteCard
							key={note.id}
							note={note}
							onEdit={() => onEdit(note.id)}
							onPin={() => onUpdate(note.id, { pinned: !note.pinned })}
							onDelete={() => onDelete(note.id)}
						/>
					),
				)}
			</div>
		</section>
	);
}
