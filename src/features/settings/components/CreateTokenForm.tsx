import { revalidateLogic } from "@tanstack/react-form";
import { Field, FieldGroup } from "#/components/ui/field";
import { CreateTokenFormSchema, createTokenDefaults } from "#/features/settings/lib/schemas";
import { useCreateToken } from "#/features/tokens/hooks/use-create-token";
import { useAppForm } from "#/hooks/use-app-form";

type CreateTokenFormProps = { onCreated?: (raw: string) => void };

export function CreateTokenForm({ onCreated }: CreateTokenFormProps) {
	const createMutation = useCreateToken();

	const form = useAppForm({
		defaultValues: createTokenDefaults,
		validators: { onDynamic: CreateTokenFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createMutation.mutate(
				{
					name: value.name.trim(),
					expiresInDays: value.expiresInDays ? Number(value.expiresInDays) : undefined,
				},
				{
					onSuccess: (result) => {
						formApi.reset();
						onCreated?.(result.raw);
					},
				},
			);
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
						{(field) => <field.InputField label="Name" placeholder="Token name" />}
					</form.AppField>
					<form.AppField name="expiresInDays">
						{(field) => (
							<field.InputField
								label="Expires in days"
								description="Leave blank for a token that never expires"
								inputMode="numeric"
								placeholder="Never"
							/>
						)}
					</form.AppField>
					<form.FormError>{createMutation.error?.message}</form.FormError>
					<Field orientation="horizontal">
						<form.SubmitButton size="sm">Create</form.SubmitButton>
					</Field>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
