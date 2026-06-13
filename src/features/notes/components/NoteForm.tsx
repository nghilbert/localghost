import { revalidateLogic } from "@tanstack/react-form";
import type { z } from "zod/v4";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Field, FieldGroup } from "#/components/ui/field";
import { NoteFormSchema } from "#/features/notes/lib/schemas";
import {
	type ChecklistItem,
	NOTE_COLORS,
	type Note,
	type NoteFormData,
	noteColorClasses,
} from "#/features/notes/lib/types";
import { useAppForm } from "#/hooks/use-app-form";
import { cn } from "#/lib/utils";

const NOTE_TYPE_OPTIONS = [
	{ value: "note", label: "Note" },
	{ value: "checklist", label: "Checklist" },
];

// ToggleGroup items can't carry an empty value, so the default color uses a sentinel.
const DEFAULT_COLOR = "default";

const COLOR_OPTIONS = NOTE_COLORS.map((color) => ({
	value: color.value ?? DEFAULT_COLOR,
	label: color.label,
	swatchClassName: `${color.bg} ${color.border}`,
}));

type NoteFormProps = {
	initial?: Partial<Note>;
	isPending: boolean;
	onSave: (data: NoteFormData) => void;
	onCancel: () => void;
};

export function NoteForm({ initial, isPending, onSave, onCancel }: NoteFormProps) {
	const form = useAppForm({
		defaultValues: {
			title: initial?.title ?? "",
			noteType: initial?.noteType === "checklist" ? "checklist" : "note",
			content: initial?.content ?? "",
			items: (initial?.items as ChecklistItem[] | null) ?? [],
			color: initial?.color ?? DEFAULT_COLOR,
			label: initial?.label ?? "",
			pinned: initial?.pinned ?? false,
		} satisfies z.infer<typeof NoteFormSchema>,
		validators: { onDynamic: NoteFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: ({ value }) => {
			onSave({
				title: value.title.trim(),
				content: value.noteType === "note" ? value.content || undefined : undefined,
				items: value.noteType === "checklist" ? value.items : undefined,
				noteType: value.noteType,
				color: value.color === DEFAULT_COLOR ? undefined : value.color,
				label: value.label.trim() || undefined,
				pinned: value.pinned,
			});
		},
	});

	return (
		<form.Subscribe selector={(state) => state.values.color}>
			{(color) => (
				<Card className={cn("p-4", noteColorClasses(color === DEFAULT_COLOR ? null : color))}>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							form.handleSubmit();
						}}
					>
						<form.AppForm>
							<FieldGroup className="gap-3">
								<form.AppField name="title">
									{(field) => <field.InputField label="Title" autoFocus />}
								</form.AppField>
								<form.AppField name="noteType">
									{(field) => <field.ToggleGroupField label="Type" options={NOTE_TYPE_OPTIONS} />}
								</form.AppField>
								<form.Subscribe selector={(state) => state.values.noteType}>
									{(noteType) =>
										noteType === "note" ? (
											<form.AppField name="content">
												{(field) => (
													<field.TextareaField
														label="Content"
														placeholder="Take a note…"
														rows={3}
													/>
												)}
											</form.AppField>
										) : (
											<form.AppField name="items">
												{(field) => <field.ChecklistField label="Items" />}
											</form.AppField>
										)
									}
								</form.Subscribe>
								<form.AppField name="label">
									{(field) => <field.InputField label="Label (optional)" />}
								</form.AppField>
								<form.AppField name="color">
									{(field) => <field.SwatchField label="Color" options={COLOR_OPTIONS} />}
								</form.AppField>
								<form.AppField name="pinned">
									{(field) => <field.SwitchField label="Pinned" />}
								</form.AppField>
								<Field orientation="horizontal">
									<form.SubmitButton size="sm" disabled={isPending}>
										{isPending ? "Saving…" : "Save"}
									</form.SubmitButton>
									<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
										Cancel
									</Button>
								</Field>
							</FieldGroup>
						</form.AppForm>
					</form>
				</Card>
			)}
		</form.Subscribe>
	);
}
