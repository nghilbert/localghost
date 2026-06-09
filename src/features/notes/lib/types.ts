export type ChecklistItem = {
	id: string;
	text: string;
	checked: boolean;
};

export type Note = {
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

export type NoteColor = {
	label: string;
	value: string | null;
	bg: string;
	border: string;
};

export const NOTE_COLORS: NoteColor[] = [
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

/** Returns combined Tailwind classes for a note's background and border given its color value. */
export function noteColorClasses(color: string | null): string {
	const match = NOTE_COLORS.find((c) => c.value === color);
	return match ? `${match.bg} ${match.border}` : "bg-card border-border";
}
