import { revalidateLogic } from "@tanstack/react-form";
import { PlusIcon } from "lucide-react";
import { Field, FieldGroup } from "#/components/ui/field";
import { useMemories } from "#/features/memory/hooks/use-memories";
import {
	AddMemoryFormSchema,
	addMemoryDefaults,
	CATEGORY_VALUES,
	toAddMemoryInput,
} from "#/features/memory/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

const CATEGORY_OPTIONS = CATEGORY_VALUES.map((category) => ({ value: category, label: category }));

type AddMemoryFormProps = { onSuccess?: () => void };

export function AddMemoryForm({ onSuccess }: AddMemoryFormProps) {
	const { addMemory } = useMemories();

	const form = useAppForm({
		defaultValues: addMemoryDefaults,
		validators: { onDynamic: AddMemoryFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await addMemory.mutate(toAddMemoryInput(value), {
				onSuccess: () => {
					formApi.reset();
					onSuccess?.();
				},
			});
		},
	});

	return (
		<form
			className="border-b pb-4"
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.AppForm>
				<FieldGroup className="gap-3">
					<form.AppField name="text">
						{(field) => (
							<field.TextareaField
								label="New memory"
								description="Press Ctrl+Enter to save"
								placeholder="Add a memory…"
								rows={2}
								className="resize-none"
								onKeyDown={(event) => {
									if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
										event.preventDefault();
										form.handleSubmit();
									}
								}}
							/>
						)}
					</form.AppField>
					<form.AppField name="category">
						{(field) => <field.SelectField label="Category" options={CATEGORY_OPTIONS} />}
					</form.AppField>
					<form.FormError>{addMemory.error?.message}</form.FormError>
					<Field orientation="horizontal">
						<form.SubmitButton size="sm">
							<PlusIcon size={13} />
							Save
						</form.SubmitButton>
					</Field>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
