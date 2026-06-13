import { revalidateLogic } from "@tanstack/react-form";
import { FieldGroup } from "#/components/ui/field";
import { useCreateCalendar } from "#/features/calendar/hooks/use-create-calendar";
import {
	CreateCalendarFormSchema,
	createCalendarDefaults,
	toCreateCalendarInput,
} from "#/features/calendar/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

type CreateCalendarFormProps = { onSuccess?: () => void };

export function CreateCalendarForm({ onSuccess }: CreateCalendarFormProps) {
	const createMutation = useCreateCalendar();

	const form = useAppForm({
		defaultValues: createCalendarDefaults,
		validators: { onDynamic: CreateCalendarFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createMutation.mutateAsync(toCreateCalendarInput(value)).then(() => {
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
						{(field) => <field.InputField label="Name" placeholder="Calendar name" autoFocus />}
					</form.AppField>
					<form.AppField name="color">
						{(field) => <field.ColorField label="Color" />}
					</form.AppField>
					<form.FormError>{createMutation.error?.message}</form.FormError>
					<form.SubmitButton>Create calendar</form.SubmitButton>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
