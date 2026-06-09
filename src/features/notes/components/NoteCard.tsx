import { PinIcon, Trash2Icon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { type ChecklistItem, type Note, noteColorClasses } from "#/features/notes/lib/types";
import { cn } from "#/lib/utils";

type NoteCardProps = {
	note: Note;
	onEdit: () => void;
	onPin: () => void;
	onDelete: () => void;
};

export function NoteCard({ note, onEdit, onPin, onDelete }: NoteCardProps) {
	const checklistItems = note.items as ChecklistItem[] | null;

	return (
		<button
			type="button"
			className={cn(
				"group mb-3 block w-full break-inside-avoid rounded-xl border p-3 text-left transition-shadow hover:shadow-md",
				noteColorClasses(note.color),
			)}
			onClick={onEdit}
		>
			{note.title && <p className="mb-1.5 font-medium leading-snug">{note.title}</p>}

			{note.noteType === "checklist" && checklistItems ? (
				<ul className="space-y-1">
					{checklistItems.slice(0, 6).map((item) => (
						<li key={item.id} className="flex items-start gap-1.5 text-sm">
							<span className={cn("mt-0.5 shrink-0", item.checked && "opacity-40")}>
								{item.checked ? "☑" : "☐"}
							</span>
							<span className={cn(item.checked && "line-through opacity-40")}>{item.text}</span>
						</li>
					))}
					{checklistItems.length > 6 && (
						<li className="text-xs text-muted-foreground">+{checklistItems.length - 6} more</li>
					)}
				</ul>
			) : (
				note.content && (
					<p className="line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">
						{note.content}
					</p>
				)
			)}

			{note.label && (
				<span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
					{note.label}
				</span>
			)}

			<div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				<Button
					variant="ghost"
					size="icon"
					className={cn("h-6 w-6 rounded-full", note.pinned && "text-primary")}
					aria-label={note.pinned ? "Unpin" : "Pin"}
					onClick={(e) => {
						e.stopPropagation();
						onPin();
					}}
				>
					<PinIcon size={12} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 rounded-full text-destructive hover:bg-destructive/10"
					aria-label="Delete note"
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
				>
					<Trash2Icon size={12} />
				</Button>
			</div>
		</button>
	);
}
