import { revalidateLogic } from "@tanstack/react-form";
import { useCreateMemory } from "#/routes/_authenticated/settings/-hooks/use-memories";
import { memoryTextInput } from "#/shared/domain/memory/schemas";
import { useAppForm } from "#/shared/hooks/use-app-form";

/** Creates a user-authored memory and clears the input after it is saved. */
export function MemoryCreateForm() {
	const createMemory = useCreateMemory();
	const form = useAppForm({
		defaultValues: { text: "" },
		validators: { onDynamic: memoryTextInput },
		validationLogic: revalidateLogic(),
		onSubmit: ({ value }) =>
			createMemory.mutateAsync(value.text.trim(), {
				onSuccess: () => form.reset(),
			}),
	});

	return (
		<form.AppForm>
			<form.SubmitForm className="gap-3">
				<form.AppField name="text">
					{(field) => (
						<field.InputField
							label="New memory"
							placeholder="e.g. I prefer metric units"
							fieldOrientation="vertical"
						/>
					)}
				</form.AppField>
				<form.SubmitButton size="sm" className="self-start" data-testid="memory-create-submit">
					Add memory
				</form.SubmitButton>
			</form.SubmitForm>
		</form.AppForm>
	);
}
