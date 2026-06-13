import { revalidateLogic } from "@tanstack/react-form";
import { FieldGroup } from "#/components/ui/field";
import { useCreateContact } from "#/features/contacts/hooks/use-create-contact";
import {
	CreateContactFormSchema,
	createContactDefaults,
	toCreateContactInput,
} from "#/features/contacts/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

type CreateContactFormProps = { onSuccess?: () => void };

export function CreateContactForm({ onSuccess }: CreateContactFormProps) {
	const createMutation = useCreateContact();

	const form = useAppForm({
		defaultValues: createContactDefaults,
		validators: { onDynamic: CreateContactFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createMutation.mutateAsync(toCreateContactInput(value)).then(() => {
				formApi.reset();
				onSuccess?.();
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
						{(field) => <field.InputField label="Name" autoFocus />}
					</form.AppField>
					<form.AppField name="emailsInput">
						{(field) => <field.InputField label="Email(s)" placeholder="Comma-separated" />}
					</form.AppField>
					<form.AppField name="phonesInput">
						{(field) => <field.InputField label="Phone(s)" placeholder="Comma-separated" />}
					</form.AppField>
					<form.AppField name="notes">
						{(field) => <field.TextareaField label="Notes (optional)" rows={2} />}
					</form.AppField>
					<form.FormError>{createMutation.error?.message}</form.FormError>
					<form.SubmitButton>Create contact</form.SubmitButton>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
