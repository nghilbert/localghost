import { revalidateLogic } from "@tanstack/react-form";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { FieldError, FieldGroup } from "#/components/ui/field";
import { createEvent } from "#/features/calendar/lib/calendar.functions";
import type { CalendarData } from "#/features/calendar/lib/types";
import { useAppForm } from "#/hooks/use-app-form";

const EventSchema = z.object({
	summary: z.string().trim().min(1, "Title is required"),
	calendarId: z.string().min(1, "Pick a calendar"),
	dtstart: z.string().min(1, "Start time is required"),
	dtend: z.string().min(1, "End time is required"),
});

type NewEventDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	calendars: CalendarData[];
	defaultDate: Date;
	onCreated: () => void;
};

function toDatetimeLocal(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultEnd(date: Date): string {
	const end = new Date(date);
	end.setHours(end.getHours() + 1);
	return toDatetimeLocal(end);
}

export function NewEventDialog({
	open,
	onOpenChange,
	calendars,
	defaultDate,
	onCreated,
}: NewEventDialogProps) {
	const [formError, setFormError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: {
			summary: "",
			calendarId: calendars[0]?.id ?? "",
			dtstart: toDatetimeLocal(defaultDate),
			dtend: defaultEnd(defaultDate),
		},
		validators: { onDynamic: EventSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				await createEvent({
					data: {
						calendarId: value.calendarId,
						summary: value.summary.trim(),
						dtstart: new Date(value.dtstart).toISOString(),
						dtend: new Date(value.dtend).toISOString(),
					},
				});
				toast.success("Event created");
				onCreated();
				onOpenChange(false);
				formApi.reset();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to create event");
			}
		},
	});

	// Reset date fields each time the dialog opens so the clicked day is reflected
	useEffect(() => {
		if (open) {
			form.reset({
				summary: "",
				calendarId: calendars[0]?.id ?? "",
				dtstart: toDatetimeLocal(defaultDate),
				dtend: defaultEnd(defaultDate),
			});
		}
	}, [open, defaultDate, calendars, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button size="sm" className="h-8 gap-1">
					<PlusIcon size={13} />
					<span className="hidden sm:inline">Event</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>New Event</DialogTitle>
					<DialogDescription>Add an event to one of your calendars.</DialogDescription>
				</DialogHeader>
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
							<FieldError>{formError}</FieldError>
							<form.SubmitButton>Create event</form.SubmitButton>
						</FieldGroup>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
