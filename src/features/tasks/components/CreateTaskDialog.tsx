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
import { createTask } from "#/features/tasks/lib/task.functions";
import { SCHEDULE_LABELS } from "#/features/tasks/lib/types";
import { useAppForm } from "#/hooks/use-app-form";

const SCHEDULE_OPTIONS = Object.entries(SCHEDULE_LABELS).map(([value, label]) => ({
	value,
	label,
}));

const TaskSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	prompt: z.string().trim().min(1, "Prompt is required"),
	schedule: z.enum(["daily", "weekly", "monthly", "once", "cron"]),
	scheduledTime: z.string(),
	cronExpression: z.string(),
});

const TaskDefaults: z.infer<typeof TaskSchema> = {
	name: "",
	prompt: "",
	schedule: "daily",
	scheduledTime: "09:00",
	cronExpression: "0 9 * * *",
};

type CreateTaskDialogProps = {
	onCreated: () => void;
};

export function CreateTaskDialog({ onCreated }: CreateTaskDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: TaskDefaults,
		validators: { onDynamic: TaskSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			const isRecurring = value.schedule !== "once" && value.schedule !== "cron";
			try {
				await createTask({
					data: {
						name: value.name.trim(),
						prompt: value.prompt.trim(),
						schedule: value.schedule,
						scheduledTime: isRecurring ? value.scheduledTime : undefined,
						cronExpression: value.schedule === "cron" ? value.cronExpression : undefined,
					},
				});
				toast.success("Task created");
				onCreated();
				setIsOpen(false);
				formApi.reset();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to create task");
			}
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-1">
					<PlusIcon size={13} />
					New Task
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Create Scheduled Task</DialogTitle>
					<DialogDescription>
						Schedule an LLM prompt to run automatically on a recurring basis.
					</DialogDescription>
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
								{(field) => <field.InputField label="Name" placeholder="Task name" />}
							</form.AppField>
							<form.AppField name="prompt">
								{(field) => (
									<field.TextareaField
										label="Prompt"
										placeholder="LLM prompt to run on schedule…"
										rows={4}
										className="resize-none"
									/>
								)}
							</form.AppField>
							<div className="flex gap-3 [&>*:first-child]:flex-1">
								<form.AppField name="schedule">
									{(field) => <field.SelectField label="Schedule" options={SCHEDULE_OPTIONS} />}
								</form.AppField>
								<form.Subscribe selector={(state) => state.values.schedule}>
									{(schedule) => (
										<>
											{schedule !== "once" && schedule !== "cron" && (
												<form.AppField name="scheduledTime">
													{(field) => (
														<field.InputField label="Time (UTC)" type="time" className="w-28" />
													)}
												</form.AppField>
											)}
											{schedule === "cron" && (
												<form.AppField name="cronExpression">
													{(field) => (
														<field.InputField label="Cron expression" placeholder="0 9 * * *" />
													)}
												</form.AppField>
											)}
										</>
									)}
								</form.Subscribe>
							</div>
							<FieldError>{formError}</FieldError>
							<form.SubmitButton>Create Task</form.SubmitButton>
						</FieldGroup>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
