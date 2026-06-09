import { useState } from "react";
import type { ChecklistItem, Note } from "#/features/notes/lib/note.types";

export type NoteFormData = {
	title: string;
	content?: string;
	items?: ChecklistItem[];
	noteType: "note" | "checklist";
	color?: string;
	label?: string;
	pinned: boolean;
};

/** Manages all local form state for creating or editing a note. */
export function useNoteForm(initial?: Partial<Note>) {
	const [title, setTitle] = useState(initial?.title ?? "");
	const [content, setContent] = useState(initial?.content ?? "");
	const [noteType, setNoteType] = useState<"note" | "checklist">(
		(initial?.noteType as "note" | "checklist") ?? "note",
	);
	const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
		(initial?.items as ChecklistItem[]) ?? [],
	);
	const [newItemText, setNewItemText] = useState("");
	const [color, setColor] = useState<string | null>(initial?.color ?? null);
	const [label, setLabel] = useState(initial?.label ?? "");
	const [isPinned, setIsPinned] = useState(initial?.pinned ?? false);

	function addChecklistItem() {
		if (!newItemText.trim()) return;
		setChecklistItems((prev) => [
			...prev,
			{ id: crypto.randomUUID(), text: newItemText.trim(), checked: false },
		]);
		setNewItemText("");
	}

	function toggleChecklistItem(id: string) {
		setChecklistItems((prev) =>
			prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
		);
	}

	function removeChecklistItem(id: string) {
		setChecklistItems((prev) => prev.filter((item) => item.id !== id));
	}

	function buildFormData(): NoteFormData {
		return {
			title,
			content: noteType === "note" ? content || undefined : undefined,
			items: noteType === "checklist" ? checklistItems : undefined,
			noteType,
			color: color ?? undefined,
			label: label || undefined,
			pinned: isPinned,
		};
	}

	return {
		title,
		setTitle,
		content,
		setContent,
		noteType,
		setNoteType,
		checklistItems,
		newItemText,
		setNewItemText,
		color,
		setColor,
		label,
		setLabel,
		isPinned,
		setIsPinned,
		addChecklistItem,
		toggleChecklistItem,
		removeChecklistItem,
		buildFormData,
	};
}
