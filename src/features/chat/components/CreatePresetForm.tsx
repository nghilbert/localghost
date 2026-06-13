import { revalidateLogic } from "@tanstack/react-form";
import { Field, FieldGroup } from "#/components/ui/field";
import { useCreatePreset } from "#/features/chat/hooks/use-create-preset";
import {
	CreatePresetFormSchema,
	createPresetDefaults,
	toCreatePresetInput,
} from "#/features/chat/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

export function CreatePresetForm() {
	const createMutation = useCreatePreset();

	const form = useAppForm({
		defaultValues: createPresetDefaults,
		validators: { onDynamic: CreatePresetFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createMutation.mutateAsync(toCreatePresetInput(value)).then(() => {
				formApi.reset();
			});
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.AppForm>
				<FieldGroup className="gap-3">
					<form.AppField name="name">
						{(field) => <field.InputField label="Name" placeholder="Preset name" />}
					</form.AppField>
					<form.AppField name="description">
						{(field) => <field.InputField label="Description (optional)" />}
					</form.AppField>
					<form.AppField name="systemPrompt">
						{(field) => (
							<field.TextareaField
								label="System prompt"
								placeholder="System prompt…"
								rows={4}
								className="resize-none"
							/>
						)}
					</form.AppField>
					<form.FormError>{createMutation.error?.message}</form.FormError>
					<Field orientation="horizontal">
						<form.SubmitButton size="sm">Save preset</form.SubmitButton>
					</Field>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
