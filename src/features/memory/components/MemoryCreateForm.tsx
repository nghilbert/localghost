import { useAppForm } from "#/components/form/use-app-form";
import { useCreateMemory } from "#/features/memory/hooks/use-create-memory";
import { memoryTextInput } from "#/features/memory/memory.schemas";

/** Adds a memory, clearing the input once saved. */
export function MemoryCreateForm() {
	const createMemory = useCreateMemory();
	const form = useAppForm({
		defaultValues: { text: "" },
		validators: { onDynamic: memoryTextInput },
		onSubmit: ({ value }) =>
			createMemory.mutateAsync(value.text.trim(), {
				onSuccess: () => form.reset(),
			}),
	});

	return (
		<form.AppForm>
			<form.Form className="gap-3">
				<form.AppField name="text">
					{(field) => (
						<field.InputField
							label="New memory"
							placeholder="e.g. I prefer metric units"
							fieldOrientation="vertical"
						/>
					)}
				</form.AppField>
				<form.SubmitButton size="sm" className="self-start">
					Add memory
				</form.SubmitButton>
			</form.Form>
		</form.AppForm>
	);
}
