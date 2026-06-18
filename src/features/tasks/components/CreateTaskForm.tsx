import { revalidateLogic } from "@tanstack/react-form";
import { useTasks } from "#/features/tasks/hooks/use-tasks";
import {
	CreateTaskFormSchema,
	createTaskDefaults,
	toCreateTaskInput,
} from "#/features/tasks/lib/schemas";
import { SCHEDULE_LABELS } from "#/features/tasks/lib/types";
import { useAppForm } from "#/hooks/use-app-form";

const SCHEDULE_OPTIONS = Object.entries(SCHEDULE_LABELS).map(([value, label]) => ({
	value,
	label,
}));

type CreateTaskFormProps = { onSuccess?: () => void };

export function CreateTaskForm({ onSuccess }: CreateTaskFormProps) {
	const { createTask } = useTasks();

	const form = useAppForm({
		defaultValues: createTaskDefaults,
		validators: { onDynamic: CreateTaskFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			await createTask.mutate(toCreateTaskInput(value), {
				onSuccess: () => {
					formApi.reset();
					onSuccess?.();
				},
			});
		},
	});

	return (
		<form.AppForm>
			<form.SubmitForm>
				<form.Section legend="Task">
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
				</form.Section>
				<form.Section legend="Schedule">
					<form.AppField name="schedule">
						{(field) => <field.SelectField label="Schedule" options={SCHEDULE_OPTIONS} />}
					</form.AppField>
					<form.Subscribe selector={(state) => state.values.schedule}>
						{(schedule) => (
							<>
								{schedule !== "once" && schedule !== "cron" && (
									<form.AppField name="scheduledTime">
										{(field) => <field.InputField label="Time (UTC)" type="time" />}
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
				</form.Section>
				<form.FormError>{createTask.error?.message}</form.FormError>
				<form.SubmitButton>Create Task</form.SubmitButton>
			</form.SubmitForm>
		</form.AppForm>
	);
}
