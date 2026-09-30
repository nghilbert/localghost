import { useAppForm } from "#/components/form/use-app-form";
import { Card } from "#/components/ui/card";
import { Field } from "#/components/ui/field";
import { accountFormSchema } from "#/features/account/account.schemas";
import { useUpdateAccount } from "#/features/account/hooks/use-update-account";
import { formatDecimal } from "#/lib/format";

type ProfileFormProps = {
	name: string;
	email: string;
	systemPrompt: string;
	temperature: number;
};

/** Edits the user's name and chat defaults. */
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
		<Card.Root>
			<Card.Header>
				<Card.Title>Profile</Card.Title>
			</Card.Header>
			<Card.Content className="space-y-3">
				<form.AppForm>
					<form.Form className="gap-3">
						<form.AppField name="name">
							{(field) => <field.InputField label="Name" />}
						</form.AppField>

						<form.AppField name="systemPrompt">
							{(field) => (
								<field.TextareaField
									label="System prompt"
									description="Instructions prepended to every chat."
									placeholder="You are a helpful assistant..."
									rows={4}
									fieldOrientation="vertical"
								/>
							)}
						</form.AppField>

						<form.AppField name="temperature">
							{(field) => (
								<field.SliderField
									label={`Temperature (${formatDecimal(field.state.value)})`}
									description="Higher values make replies more random; lower values more focused."
									fieldOrientation="vertical"
									className="min-w-xs"
									min={0}
									max={2}
									step={0.1}
								/>
							)}
						</form.AppField>

						<form.SubmitButton size="sm">Save</form.SubmitButton>
					</form.Form>
				</form.AppForm>
				<Field.Root>
					<Field.Label>Email</Field.Label>
					<span className="text-sm">{email}</span>
				</Field.Root>
			</Card.Content>
		</Card.Root>
	);
}
