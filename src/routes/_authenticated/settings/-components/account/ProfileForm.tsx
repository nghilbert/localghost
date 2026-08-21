import { useUpdateAccount } from "#/routes/_authenticated/settings/-hooks/use-update-account";
import { accountFormSchema } from "#/routes/_authenticated/settings/-lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "#/shared/components/ui/card";
import { Field, FieldLabel } from "#/shared/components/ui/field";
import { useAppForm } from "#/shared/hooks/use-app-form";

type ProfileFormProps = {
	name: string;
	email: string;
	systemPrompt: string;
	temperature: number;
};

/** Edits the user's profile and global generation defaults. */
export function ProfileForm({ name, email, systemPrompt, temperature }: ProfileFormProps) {
	const updateAccount = useUpdateAccount();
	const form = useAppForm({
		defaultValues: { name, systemPrompt, temperature },
		validators: { onDynamic: accountFormSchema },
		onSubmit: ({ value }) =>
			updateAccount.mutateAsync({
				name: value.name.trim(),
				systemPrompt: value.systemPrompt,
				temperature: value.temperature,
			}),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Profile</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<form.AppForm>
					<form.SubmitForm className="gap-3">
						<form.AppField name="name">
							{(field) => <field.InputField label="Name" />}
						</form.AppField>

						<form.AppField name="systemPrompt">
							{(field) => (
								<field.TextareaField
									label="System prompt"
									description="Instructions prepended to every chat."
									placeholder="You are a helpful assistant…"
									rows={4}
									fieldOrientation="vertical"
								/>
							)}
						</form.AppField>

						<form.AppField name="temperature">
							{(field) => (
								<field.SliderField
									label={`Temperature (${field.state.value.toFixed(1)})`}
									description="Higher values make replies more random; lower values more focused."
									fieldOrientation="vertical"
									className="min-w-xs"
									min={0}
									max={2}
									step={0.1}
								/>
							)}
						</form.AppField>

						<form.SubmitButton size="sm" data-testid="profile-submit">
							Save
						</form.SubmitButton>
					</form.SubmitForm>
				</form.AppForm>
				<Field>
					<FieldLabel>Email</FieldLabel>
					<span className="text-sm">{email}</span>
				</Field>
			</CardContent>
		</Card>
	);
}
