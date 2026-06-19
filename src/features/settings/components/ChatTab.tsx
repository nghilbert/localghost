import { revalidateLogic } from "@tanstack/react-form";
import { Field } from "#/components/ui/field";
import { useUserSettings } from "#/features/settings/hooks/use-user-settings";
import { ChatSettingsFormSchema } from "#/features/settings/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

export function ChatTab() {
	const { settings, update } = useUserSettings();

	const form = useAppForm({
		defaultValues: {
			systemPrompt: settings.systemPrompt ?? "",
			temperature: settings.temperature,
		},
		validators: { onDynamic: ChatSettingsFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			await update.mutate({
				systemPrompt: value.systemPrompt.trim() || null,
				temperature: value.temperature,
			});
		},
	});

	return (
		<form.AppForm>
			<form.SubmitForm className="gap-4">
				<p className="text-sm text-muted-foreground">
					Defaults applied to every conversation, across all models.
				</p>
				<form.AppField name="systemPrompt">
					{(field) => (
						<field.TextareaField
							label="System prompt"
							description="Instructions prepended to every chat."
							placeholder="You are a helpful assistant…"
							rows={4}
						/>
					)}
				</form.AppField>
				<form.AppField name="temperature">
					{(field) => (
						<field.SliderField
							label={`Temperature — ${field.state.value.toFixed(1)}`}
							description="Lower is more precise, higher is more creative."
							min={0}
							max={2}
							step={0.1}
						/>
					)}
				</form.AppField>
				<Field orientation="horizontal">
					<form.SubmitButton size="sm">Save</form.SubmitButton>
				</Field>
			</form.SubmitForm>
		</form.AppForm>
	);
}
