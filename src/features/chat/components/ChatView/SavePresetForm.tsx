import { revalidateLogic } from "@tanstack/react-form";
import { usePresets } from "#/features/chat/hooks/use-presets";
import { SavePresetNameFormSchema, savePresetNameDefaults } from "#/features/chat/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

type SavePresetFormProps = {
	systemPrompt: string;
	temperature: number;
	model: string;
	onSuccess?: () => void;
};

export function SavePresetForm({
	systemPrompt,
	temperature,
	model,
	onSuccess,
}: SavePresetFormProps) {
	const { createPreset } = usePresets();

	const form = useAppForm({
		defaultValues: savePresetNameDefaults,
		validators: { onDynamic: SavePresetNameFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createPreset.mutate(
				{ name: value.name.trim(), systemPrompt, temperature, model },
				{
					onSuccess: () => {
						formApi.reset();
						onSuccess?.();
					},
				},
			);
		},
	});

	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.AppForm>
				<form.AppField name="name">
					{(field) => <field.InputField label="Name" placeholder="My preset" />}
				</form.AppField>
				<form.FormError>{createPreset.error?.message}</form.FormError>
				<form.SubmitButton>Save</form.SubmitButton>
			</form.AppForm>
		</form>
	);
}
