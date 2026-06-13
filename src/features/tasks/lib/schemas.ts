import { z } from "zod/v4";

const SCHEDULES = ["once", "daily", "weekly", "monthly", "cron"] as const;

// Form draft shape — scheduledTime/cronExpression are always present strings.
export const CreateTaskFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	prompt: z.string().trim().min(1, "Prompt is required"),
	schedule: z.enum(["daily", "weekly", "monthly", "once", "cron"]),
	scheduledTime: z.string(),
	cronExpression: z.string(),
});

export const createTaskDefaults: z.infer<typeof CreateTaskFormSchema> = {
	name: "",
	prompt: "",
	schedule: "daily",
	scheduledTime: "09:00",
	cronExpression: "0 9 * * *",
};

// Server input — what the server fn validates and the DB receives.
export const createTaskInput = z.object({
	name: z.string().min(1),
	prompt: z.string().min(1),
	schedule: z.enum(SCHEDULES).default("daily"),
	scheduledTime: z.string().optional(),
	cronExpression: z.string().optional(),
	sessionId: z.uuid().optional(),
});

export const updateTaskInput = z.object({
	id: z.uuid(),
	status: z.enum(["active", "paused", "completed"]).optional(),
	name: z.string().min(1).optional(),
	prompt: z.string().optional(),
});

export const deleteTaskInput = z.object({ id: z.uuid() });

export const runTaskInput = z.object({ id: z.uuid() });

export const getTaskRunsInput = z.object({ taskId: z.uuid() });

// Bridge the form draft into server input — only send the schedule field that applies.
export const toCreateTaskInput = (
	value: z.infer<typeof CreateTaskFormSchema>,
): z.infer<typeof createTaskInput> => {
	const isRecurring = value.schedule !== "once" && value.schedule !== "cron";
	return {
		name: value.name.trim(),
		prompt: value.prompt.trim(),
		schedule: value.schedule,
		scheduledTime: isRecurring ? value.scheduledTime : undefined,
		cronExpression: value.schedule === "cron" ? value.cronExpression : undefined,
	};
};
