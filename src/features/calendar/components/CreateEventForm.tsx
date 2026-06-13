import { revalidateLogic } from "@tanstack/react-form";
import { FieldGroup } from "#/components/ui/field";
import { useCreateEvent } from "#/features/calendar/hooks/use-create-event";
import { CreateEventFormSchema, toCreateEventInput } from "#/features/calendar/lib/schemas";
import type { CalendarData } from "#/features/calendar/lib/types";
import { useAppForm } from "#/hooks/use-app-form";

function toDatetimeLocal(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultEnd(date: Date): string {
	const end = new Date(date);
	end.setHours(end.getHours() + 1);
	return toDatetimeLocal(end);
}

type CreateEventFormProps = {
	calendars: CalendarData[];
	defaultDate: Date;
	onSuccess?: () => void;
};

export function CreateEventForm({ calendars, defaultDate, onSuccess }: CreateEventFormProps) {
	const createMutation = useCreateEvent();

	const form = useAppForm({
		defaultValues: {
			summary: "",
			calendarId: calendars[0]?.id ?? "",
			dtstart: toDatetimeLocal(defaultDate),
			dtend: defaultEnd(defaultDate),
		},
		validators: { onDynamic: CreateEventFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createMutation.mutate(toCreateEventInput(value), {
				onSuccess: () => {
					formApi.reset();
					onSuccess?.();
				},
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
					<form.AppField name="summary">
						{(field) => <field.InputField label="Title" placeholder="Event title" autoFocus />}
					</form.AppField>
					<div className="grid grid-cols-2 gap-2">
						<form.AppField name="dtstart">
							{(field) => (
								<field.InputField label="Start" type="datetime-local" className="text-xs" />
							)}
						</form.AppField>
						<form.AppField name="dtend">
							{(field) => (
								<field.InputField label="End" type="datetime-local" className="text-xs" />
							)}
						</form.AppField>
					</div>
					{calendars.length > 0 && (
						<form.AppField name="calendarId">
							{(field) => (
								<field.SelectField
									label="Calendar"
									options={calendars.map((calendar) => ({
										value: calendar.id,
										label: calendar.name,
									}))}
								/>
							)}
						</form.AppField>
					)}
					<form.FormError>{createMutation.error?.message}</form.FormError>
					<form.SubmitButton>Create event</form.SubmitButton>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
