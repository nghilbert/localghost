import { PinIcon, XIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { NOTE_COLORS, type Note, noteColorClasses } from "#/features/notes/lib/types";
import { type NoteFormData, useNoteForm } from "#/features/notes/lib/use-note-form";
import { cn } from "#/lib/utils";

type NoteFormProps = {
	initial?: Partial<Note>;
	isPending: boolean;
	onSave: (data: NoteFormData) => void;
	onCancel: () => void;
};

export function NoteForm({ initial, isPending, onSave, onCancel }: NoteFormProps) {
	const form = useNoteForm(initial);

	return (
		<div className={cn("rounded-xl border p-3 shadow-lg", noteColorClasses(form.color))}>
			<Input
				value={form.title}
				onChange={(e) => form.setTitle(e.target.value)}
				placeholder="Title"
				className="mb-2 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
			/>

			{/* Note type toggle */}
			<div className="mb-2 flex gap-1">
				{(["note", "checklist"] as const).map((type) => (
					<button
						key={type}
						type="button"
						onClick={() => form.setNoteType(type)}
						className={cn(
							"rounded px-2 py-0.5 text-xs capitalize",
							form.noteType === type
								? "bg-primary/10 text-primary"
								: "text-muted-foreground hover:bg-muted",
						)}
					>
						{type}
					</button>
				))}
			</div>

			{form.noteType === "note" ? (
				<Textarea
					value={form.content}
					onChange={(e) => form.setContent(e.target.value)}
					placeholder="Take a note…"
					rows={3}
					className="mb-2 resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
				/>
			) : (
				<div className="mb-2 space-y-1">
					{form.checklistItems.map((item) => (
						<div key={item.id} className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => form.toggleChecklistItem(item.id)}
								className="shrink-0 text-muted-foreground"
							>
								{item.checked ? "☑" : "☐"}
							</button>
							<span className={cn("flex-1 text-sm", item.checked && "line-through opacity-40")}>
								{item.text}
							</span>
							<button
								type="button"
								onClick={() => form.removeChecklistItem(item.id)}
								className="shrink-0 text-muted-foreground hover:text-destructive"
							>
								<XIcon size={11} />
							</button>
						</div>
					))}
					<div className="flex items-center gap-1.5">
						<span className="shrink-0 text-muted-foreground">+</span>
						<input
							type="text"
							value={form.newItemText}
							onChange={(e) => form.setNewItemText(e.target.value)}
							placeholder="Add item…"
							className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
							onKeyDown={(e) => e.key === "Enter" && form.addChecklistItem()}
						/>
					</div>
				</div>
			)}

			<Input
				value={form.label}
				onChange={(e) => form.setLabel(e.target.value)}
				placeholder="Label (optional)"
				className="mb-2 border-none bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
			/>

			{/* Color swatches */}
			<div className="mb-3 flex flex-wrap gap-1">
				{NOTE_COLORS.map((noteColor) => (
					<button
						key={noteColor.label}
						type="button"
						title={noteColor.label}
						onClick={() => form.setColor(noteColor.value)}
						className={cn(
							"h-5 w-5 rounded-full border-2",
							noteColor.value ? "" : "bg-card",
							form.color === noteColor.value ? "border-primary" : "border-transparent",
						)}
						style={noteColor.value ? { backgroundColor: noteColor.value } : undefined}
					/>
				))}
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => form.setIsPinned((prev) => !prev)}
					className={cn(
						"h-auto gap-1 px-1.5 py-0.5 text-xs",
						form.isPinned ? "text-primary" : "text-muted-foreground",
					)}
				>
					<PinIcon size={11} />
					{form.isPinned ? "Pinned" : "Pin"}
				</Button>
				<div className="flex-1" />
				<Button variant="ghost" size="sm" onClick={onCancel} className="h-auto px-2 py-1 text-xs">
					Cancel
				</Button>
				<Button
					size="sm"
					onClick={() => onSave(form.buildFormData())}
					disabled={isPending}
					className="h-auto px-2 py-1 text-xs"
				>
					{isPending ? "Saving…" : "Save"}
				</Button>
			</div>
		</div>
	);
}
