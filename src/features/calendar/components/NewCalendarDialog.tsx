import { revalidateLogic } from "@tanstack/react-form";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
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
import { createCalendar } from "#/features/calendar/lib/calendar.functions";
import { useAppForm } from "#/hooks/use-app-form";

const CalendarSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	color: z.string(),
});

const CalendarDefaults: z.infer<typeof CalendarSchema> = {
	name: "",
	color: "#5b8abf",
};

type NewCalendarDialogProps = {
	onCreated: () => void;
};

export function NewCalendarDialog({ onCreated }: NewCalendarDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: CalendarDefaults,
		validators: { onDynamic: CalendarSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				await createCalendar({ data: { name: value.name.trim(), color: value.color } });
				toast.success("Calendar created");
				onCreated();
				setIsOpen(false);
				formApi.reset();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to create calendar");
			}
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-1">
					<PlusIcon size={13} />
					<span className="hidden sm:inline">Calendar</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>New Calendar</DialogTitle>
					<DialogDescription>Create a local calendar to organize events.</DialogDescription>
				</DialogHeader>
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
							<FieldError>{formError}</FieldError>
							<form.SubmitButton>Create calendar</form.SubmitButton>
						</FieldGroup>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
