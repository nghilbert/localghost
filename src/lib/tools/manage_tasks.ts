import { z } from "zod/v4";
import { prisma } from "#/lib/db.server";
import { computeNextRun, executeTaskById } from "#/lib/scheduler.server";

export const manageTasksArgsSchema = z.object({
	action: z.enum(["list", "create", "update", "delete", "pause", "resume", "run_now"]),
	id: z.string().optional(),
	name: z.string().optional(),
	prompt: z.string().optional(),
	schedule: z.enum(["once", "daily", "weekly", "monthly", "cron"]).optional(),
	scheduled_time: z.string().optional(),
	cron_expression: z.string().optional(),
	session_id: z.string().optional(),
	limit: z.number().optional(),
});

type ManageTasksArgs = z.infer<typeof manageTasksArgsSchema>;

export async function manageTasks(args: ManageTasksArgs, ownerId: string): Promise<string> {
	switch (args.action) {
		case "list":
			return listTasks(args, ownerId);
		case "create":
			return createTask(args, ownerId);
		case "update":
			return updateTask(args, ownerId);
		case "delete":
			return deleteTask(args, ownerId);
		case "pause":
			return setTaskStatus(args, ownerId, "paused");
		case "resume":
			return setTaskStatus(args, ownerId, "active");
		case "run_now":
			return runTaskNow(args, ownerId);
		default:
			return `Unknown task action: ${args.action}`;
	}
}

async function findTask(id: string, ownerId: string) {
	const tasks = await prisma.scheduledTask.findMany({ where: { ownerId } });
	return tasks.find((t) => t.id === id || t.id.startsWith(id)) ?? null;
}

async function listTasks(args: ManageTasksArgs, ownerId: string): Promise<string> {
	const limit = Math.min(args.limit ?? 20, 50);
	const tasks = await prisma.scheduledTask.findMany({
		where: { ownerId },
		orderBy: { createdAt: "desc" },
		take: limit,
	});

	if (tasks.length === 0) return "No scheduled tasks found.";

	return tasks
		.map((t) => {
			const next = t.nextRun ? ` | next: ${t.nextRun.toISOString()}` : "";
			return `[${t.id.slice(0, 8)}] ${t.name} (${t.schedule}, ${t.status})${next}`;
		})
		.join("\n");
}

async function createTask(args: ManageTasksArgs, ownerId: string): Promise<string> {
	if (!args.name?.trim()) return "name is required to create a task";
	if (!args.prompt?.trim()) return "prompt is required to create a task";

	const schedule = args.schedule ?? "daily";
	const nextRun = computeNextRun(
		schedule,
		args.scheduled_time ?? null,
		args.cron_expression ?? null,
	);

	const task = await prisma.scheduledTask.create({
		data: {
			name: args.name,
			prompt: args.prompt,
			taskType: "llm",
			schedule,
			scheduledTime: args.scheduled_time ?? null,
			cronExpression: args.cron_expression ?? null,
			sessionId: args.session_id ?? null,
			nextRun,
			ownerId,
		},
	});

	return `Task created (id: ${task.id.slice(0, 8)}): "${task.name}" — ${schedule}`;
}

async function updateTask(args: ManageTasksArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to update a task";
	const task = await findTask(args.id, ownerId);
	if (!task) return `Task not found: ${args.id}`;

	const schedule = args.schedule ?? task.schedule;
	const scheduledTime = args.scheduled_time ?? task.scheduledTime;
	const cronExpression = args.cron_expression ?? task.cronExpression;

	await prisma.scheduledTask.update({
		where: { id: task.id },
		data: {
			...(args.name !== undefined ? { name: args.name } : {}),
			...(args.prompt !== undefined ? { prompt: args.prompt } : {}),
			schedule,
			scheduledTime,
			cronExpression,
			nextRun: computeNextRun(schedule, scheduledTime, cronExpression),
		},
	});

	return `Task updated: "${args.name ?? task.name}"`;
}

async function deleteTask(args: ManageTasksArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to delete a task";
	const task = await findTask(args.id, ownerId);
	if (!task) return `Task not found: ${args.id}`;
	await prisma.scheduledTask.delete({ where: { id: task.id } });
	return `Task deleted: "${task.name}"`;
}

async function setTaskStatus(
	args: ManageTasksArgs,
	ownerId: string,
	status: "active" | "paused",
): Promise<string> {
	if (!args.id) return "id is required";
	const task = await findTask(args.id, ownerId);
	if (!task) return `Task not found: ${args.id}`;
	await prisma.scheduledTask.update({ where: { id: task.id }, data: { status } });
	return `Task "${task.name}" ${status === "active" ? "resumed" : "paused"}.`;
}

async function runTaskNow(args: ManageTasksArgs, ownerId: string): Promise<string> {
	if (!args.id) return "id is required to run a task";
	const task = await findTask(args.id, ownerId);
	if (!task) return `Task not found: ${args.id}`;
	// Fire-and-forget; we return immediately and let it complete in the background
	executeTaskById(task.id).catch((e) => console.error("[manage_tasks] run_now error:", e));
	return `Task "${task.name}" triggered. Output will appear in the linked session when complete.`;
}
