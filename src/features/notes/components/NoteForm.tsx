import { PinIcon, XIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { type NoteFormData, useNoteForm } from "#/features/notes/hooks/use-note-form";
import { NOTE_COLORS, type Note, noteColorClasses } from "#/features/notes/lib/types";
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

			<ToggleGroup
				type="single"
				value={form.noteType}
				onValueChange={(v) => v && form.setNoteType(v as "note" | "checklist")}
				variant="default"
				size="sm"
				className="mb-2 justify-start"
			>
				<ToggleGroupItem value="note" className="h-auto px-2 py-0.5 text-xs capitalize">
					note
				</ToggleGroupItem>
				<ToggleGroupItem value="checklist" className="h-auto px-2 py-0.5 text-xs capitalize">
					checklist
				</ToggleGroupItem>
			</ToggleGroup>

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
							<Checkbox
								checked={item.checked}
								onCheckedChange={() => form.toggleChecklistItem(item.id)}
								className="shrink-0"
							/>
							<span className={cn("flex-1 text-sm", item.checked && "line-through opacity-40")}>
								{item.text}
							</span>
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
								onClick={() => form.removeChecklistItem(item.id)}
								aria-label="Remove item"
							>
								<XIcon size={11} />
							</Button>
						</div>
					))}
					<div className="flex items-center gap-1.5">
						<span className="shrink-0 text-muted-foreground">+</span>
						<Input
							value={form.newItemText}
							onChange={(e) => form.setNewItemText(e.target.value)}
							placeholder="Add item…"
							className="h-auto flex-1 border-none bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
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
