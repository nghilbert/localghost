import { PinIcon, Trash2Icon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { checklistItemsSchema } from "#/features/notes/lib/schemas";
import { type Note, noteColorClasses } from "#/features/notes/lib/types";
import { cn } from "#/lib/utils";

type NoteCardProps = {
	note: Note;
	onEdit: () => void;
	onPin: () => void;
	onDelete: () => void;
};

export function NoteCard({ note, onEdit, onPin, onDelete }: NoteCardProps) {
	const checklistItems = checklistItemsSchema.parse(note.items);

	return (
		<Card
			className={cn(
				"group relative gap-2 p-3 transition-shadow hover:shadow-md",
				noteColorClasses(note.color),
			)}
		>
			{/* Sibling overlay, not a wrapper: a button must not contain the action buttons below */}
			<Button
				variant="ghost"
				className="absolute inset-0 h-auto"
				onClick={onEdit}
				aria-label="Edit note"
			/>

			{note.title && <p className="font-medium leading-snug">{note.title}</p>}

			{note.noteType === "checklist" && checklistItems.length > 0 ? (
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
				<Badge variant="secondary" className="w-fit">
					{note.label}
				</Badge>
			)}

			<div className="relative flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				<Button
					variant="ghost"
					size="icon-sm"
					className={cn(note.pinned && "text-primary")}
					aria-label={note.pinned ? "Unpin" : "Pin"}
					onClick={onPin}
				>
					<PinIcon size={12} />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					className="text-destructive hover:text-destructive"
					aria-label="Delete note"
					onClick={onDelete}
				>
					<Trash2Icon size={12} />
				</Button>
			</div>
		</Card>
	);
}
