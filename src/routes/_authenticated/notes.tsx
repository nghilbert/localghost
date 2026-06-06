import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PinIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import {
	createNote,
	deleteNote,
	notesQueryOptions,
	updateNote,
} from "#/features/notes/lib/note.functions";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authenticated/notes")({
	component: NotesPage,
});

type ChecklistItem = { id: string; text: string; checked: boolean };

type Note = {
	id: string;
	title: string;
	content: string | null;
	items: unknown;
	noteType: string;
	color: string | null;
	label: string | null;
	pinned: boolean;
	archived: boolean;
	updatedAt: Date | string;
};

const NOTE_COLORS = [
	{ label: "Default", value: null, bg: "bg-card", border: "border-border" },
	{
		label: "Red",
		value: "#fecaca",
		bg: "bg-red-100 dark:bg-red-900/30",
		border: "border-red-200 dark:border-red-800",
	},
	{
		label: "Orange",
		value: "#fed7aa",
		bg: "bg-orange-100 dark:bg-orange-900/30",
		border: "border-orange-200 dark:border-orange-800",
	},
	{
		label: "Yellow",
		value: "#fef08a",
		bg: "bg-yellow-100 dark:bg-yellow-900/30",
		border: "border-yellow-200 dark:border-yellow-800",
	},
	{
		label: "Green",
		value: "#bbf7d0",
		bg: "bg-green-100 dark:bg-green-900/30",
		border: "border-green-200 dark:border-green-800",
	},
	{
		label: "Blue",
		value: "#bfdbfe",
		bg: "bg-blue-100 dark:bg-blue-900/30",
		border: "border-blue-200 dark:border-blue-800",
	},
	{
		label: "Purple",
		value: "#e9d5ff",
		bg: "bg-purple-100 dark:bg-purple-900/30",
		border: "border-purple-200 dark:border-purple-800",
	},
];

function colorClasses(color: string | null): string {
	const found = NOTE_COLORS.find((c) => c.value === color);
	return found ? `${found.bg} ${found.border}` : "bg-card border-border";
}

function NotesPage() {
	const queryClient = useQueryClient();
	const { data: notes = [] } = useQuery(notesQueryOptions());
	const [creating, setCreating] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	const createMut = useMutation({
		mutationFn: createNote,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notes"] });
			setCreating(false);
		},
	});

	const updateMut = useMutation({
		mutationFn: updateNote,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notes"] });
			setEditingId(null);
		},
	});

	const deleteMut = useMutation({
		mutationFn: deleteNote,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
	});

	const pinned = notes.filter((n) => n.pinned);
	const unpinned = notes.filter((n) => !n.pinned);

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<PageHeader
				title="Notes"
				description={`${notes.length} note${notes.length !== 1 ? "s" : ""}`}
				actions={
					<Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
						<PlusIcon size={13} />
						New note
					</Button>
				}
			/>

			<div className="flex-1 overflow-auto p-4">
				{/* Quick-create form */}
				{creating && (
					<NoteForm
						onSave={(data) => createMut.mutate({ data })}
						onCancel={() => setCreating(false)}
						isPending={createMut.isPending}
					/>
				)}

				{notes.length === 0 && !creating && (
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-muted-foreground">
							No notes yet. Click "New note" to start.
						</p>
					</div>
				)}

				{pinned.length > 0 && (
					<NoteGroup
						label="Pinned"
						notes={pinned}
						editingId={editingId}
						onEdit={setEditingId}
						onUpdate={updateMut}
						onDelete={(id) => deleteMut.mutate({ data: { id } })}
					/>
				)}
				{unpinned.length > 0 && (
					<NoteGroup
						label={pinned.length > 0 ? "Others" : undefined}
						notes={unpinned}
						editingId={editingId}
						onEdit={setEditingId}
						onUpdate={updateMut}
						onDelete={(id) => deleteMut.mutate({ data: { id } })}
					/>
				)}
			</div>
		</div>
	);
}

function NoteGroup({
	label,
	notes,
	editingId,
	onEdit,
	onUpdate,
	onDelete,
}: {
	label?: string;
	notes: Note[];
	editingId: string | null;
	onEdit: (id: string | null) => void;
	onUpdate: ReturnType<
		typeof useMutation<unknown, Error, { data: Parameters<typeof updateNote>[0]["data"] }>
	>;
	onDelete: (id: string) => void;
}) {
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
								onSave={(data) => onUpdate.mutate({ data: { id: note.id, ...data } })}
								onCancel={() => onEdit(null)}
								isPending={onUpdate.isPending}
							/>
						</div>
					) : (
						<NoteCard
							key={note.id}
							note={note}
							onEdit={() => onEdit(note.id)}
							onPin={() => onUpdate.mutate({ data: { id: note.id, pinned: !note.pinned } })}
							onDelete={() => onDelete(note.id)}
						/>
					),
				)}
			</div>
		</section>
	);
}

function NoteCard({
	note,
	onEdit,
	onPin,
	onDelete,
}: {
	note: Note;
	onEdit: () => void;
	onPin: () => void;
	onDelete: () => void;
}) {
	const items = note.items as ChecklistItem[] | null;

	return (
		<button
			type="button"
			className={cn(
				"group mb-3 block w-full break-inside-avoid rounded-xl border p-3 text-left transition-shadow hover:shadow-md",
				colorClasses(note.color),
			)}
			onClick={onEdit}
		>
			{note.title && <p className="mb-1.5 font-medium leading-snug">{note.title}</p>}
			{note.noteType === "checklist" && items ? (
				<ul className="space-y-1">
					{items.slice(0, 6).map((item) => (
						<li key={item.id} className="flex items-start gap-1.5 text-sm">
							<span className={cn("mt-0.5 shrink-0", item.checked && "opacity-40")}>
								{item.checked ? "☑" : "☐"}
							</span>
							<span className={cn(item.checked && "line-through opacity-40")}>{item.text}</span>
						</li>
					))}
					{items.length > 6 && (
						<li className="text-xs text-muted-foreground">+{items.length - 6} more</li>
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
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onPin();
					}}
					className={cn(
						"flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10",
						note.pinned && "text-primary",
					)}
					aria-label={note.pinned ? "Unpin" : "Pin"}
				>
					<PinIcon size={12} />
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
					className="flex h-6 w-6 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
					aria-label="Delete note"
				>
					<Trash2Icon size={12} />
				</button>
			</div>
		</button>
	);
}

function NoteForm({
	initial,
	onSave,
	onCancel,
	isPending,
}: {
	initial?: Partial<Note>;
	onSave: (data: {
		title: string;
		content?: string;
		items?: ChecklistItem[];
		noteType: "note" | "checklist";
		color?: string;
		label?: string;
		pinned: boolean;
	}) => void;
	onCancel: () => void;
	isPending: boolean;
}) {
	const [title, setTitle] = useState(initial?.title ?? "");
	const [content, setContent] = useState(initial?.content ?? "");
	const [noteType, setNoteType] = useState<"note" | "checklist">(
		(initial?.noteType as "note" | "checklist") ?? "note",
	);
	const [items, setItems] = useState<ChecklistItem[]>((initial?.items as ChecklistItem[]) ?? []);
	const [newItemText, setNewItemText] = useState("");
	const [color, setColor] = useState<string | null>(initial?.color ?? null);
	const [label, setLabel] = useState(initial?.label ?? "");
	const [pinned, setPinned] = useState(initial?.pinned ?? false);

	function addItem() {
		if (!newItemText.trim()) return;
		setItems((prev) => [
			...prev,
			{ id: crypto.randomUUID(), text: newItemText.trim(), checked: false },
		]);
		setNewItemText("");
	}

	function toggleItem(id: string) {
		setItems((prev) => prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
	}

	function removeItem(id: string) {
		setItems((prev) => prev.filter((it) => it.id !== id));
	}

	function handleSave() {
		onSave({
			title,
			content: noteType === "note" ? content || undefined : undefined,
			items: noteType === "checklist" ? items : undefined,
			noteType,
			color: color ?? undefined,
			label: label || undefined,
			pinned,
		});
	}

	return (
		<div
			className={cn("rounded-xl border p-3 shadow-lg", colorClasses(color))}
			onClick={(e) => e.stopPropagation()}
			onKeyDown={(e) => e.stopPropagation()}
		>
			<input
				type="text"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder="Title"
				className="mb-2 w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
				autoFocus
			/>

			{/* Type toggle */}
			<div className="mb-2 flex gap-1">
				<button
					type="button"
					onClick={() => setNoteType("note")}
					className={cn(
						"rounded px-2 py-0.5 text-xs",
						noteType === "note"
							? "bg-primary/10 text-primary"
							: "text-muted-foreground hover:bg-muted",
					)}
				>
					Note
				</button>
				<button
					type="button"
					onClick={() => setNoteType("checklist")}
					className={cn(
						"rounded px-2 py-0.5 text-xs",
						noteType === "checklist"
							? "bg-primary/10 text-primary"
							: "text-muted-foreground hover:bg-muted",
					)}
				>
					Checklist
				</button>
			</div>

			{noteType === "note" ? (
				<textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Take a note…"
					rows={3}
					className="mb-2 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
				/>
			) : (
				<div className="mb-2 space-y-1">
					{items.map((item) => (
						<div key={item.id} className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => toggleItem(item.id)}
								className="shrink-0 text-muted-foreground"
							>
								{item.checked ? "☑" : "☐"}
							</button>
							<span className={cn("flex-1 text-sm", item.checked && "line-through opacity-40")}>
								{item.text}
							</span>
							<button
								type="button"
								onClick={() => removeItem(item.id)}
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
							value={newItemText}
							onChange={(e) => setNewItemText(e.target.value)}
							placeholder="Add item…"
							className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
							onKeyDown={(e) => e.key === "Enter" && addItem()}
						/>
					</div>
				</div>
			)}

			{/* Label */}
			<input
				type="text"
				value={label}
				onChange={(e) => setLabel(e.target.value)}
				placeholder="Label (optional)"
				className="mb-2 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
			/>

			{/* Color swatches */}
			<div className="mb-3 flex flex-wrap gap-1">
				{NOTE_COLORS.map((c) => (
					<button
						key={c.label}
						type="button"
						title={c.label}
						onClick={() => setColor(c.value)}
						className={cn(
							"h-5 w-5 rounded-full border-2",
							c.value ? "" : "bg-card",
							color === c.value ? "border-primary" : "border-transparent",
						)}
						style={c.value ? { backgroundColor: c.value } : undefined}
					/>
				))}
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => setPinned((p) => !p)}
					className={cn(
						"flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
						pinned ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
					)}
				>
					<PinIcon size={11} />
					{pinned ? "Pinned" : "Pin"}
				</button>
				<div className="flex-1" />
				<button
					type="button"
					onClick={onCancel}
					className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={handleSave}
					disabled={isPending}
					className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{isPending ? "Saving…" : "Save"}
				</button>
			</div>
		</div>
	);
}
