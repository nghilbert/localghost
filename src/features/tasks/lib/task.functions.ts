import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/features/auth/lib/auth.server";
import {
	createTaskInput,
	deleteTaskInput,
	getTaskRunsInput,
	runTaskInput,
	updateTaskInput,
} from "#/features/tasks/lib/schemas";
import { prisma } from "#/lib/db.server";
import { computeNextRun, executeTaskById } from "#/lib/scheduler.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const getTasks = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.scheduledTask.findMany({
		where: { ownerId: userId },
		orderBy: { createdAt: "desc" },
		include: {
			runs: {
				orderBy: { startedAt: "desc" },
				take: 1,
				select: { id: true, status: true, startedAt: true, finishedAt: true, error: true },
			},
		},
	});
});

export const createTask = createServerFn({ method: "POST" })
	.validator(createTaskInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const nextRun = computeNextRun(
			data.schedule,
			data.scheduledTime ?? null,
			data.cronExpression ?? null,
		);

		return prisma.scheduledTask.create({
			data: {
				name: data.name,
				prompt: data.prompt,
				taskType: "llm",
				schedule: data.schedule,
				scheduledTime: data.scheduledTime ?? null,
				cronExpression: data.cronExpression ?? null,
				sessionId: data.sessionId ?? null,
				nextRun,
				ownerId: userId,
			},
		});
	});

export const updateTask = createServerFn({ method: "POST" })
	.validator(updateTaskInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const task = await prisma.scheduledTask.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!task) throw new Error("Task not found");

		const { id, ...updates } = data;
		return prisma.scheduledTask.update({ where: { id }, data: updates });
	});

export const deleteTask = createServerFn({ method: "POST" })
	.validator(deleteTaskInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.scheduledTask.deleteMany({ where: { id: data.id, ownerId: userId } });
	});

export const runTaskNow = createServerFn({ method: "POST" })
	.validator(runTaskInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const task = await prisma.scheduledTask.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!task) throw new Error("Task not found");
		await executeTaskById(data.id);
		return { triggered: true };
	});

export const getTaskRuns = createServerFn({ method: "GET" })
	.validator(getTaskRunsInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const task = await prisma.scheduledTask.findFirst({
			where: { id: data.taskId, ownerId: userId },
		});
		if (!task) throw new Error("Task not found");

		return prisma.taskRun.findMany({
			where: { taskId: data.taskId },
			orderBy: { startedAt: "desc" },
			take: 20,
		});
	});

export const tasksQueryOptions = () =>
	queryOptions({ queryKey: ["tasks"], queryFn: () => getTasks() });

export const taskRunsQueryOptions = (taskId: string) =>
	queryOptions({
		queryKey: ["task-runs", taskId],
		queryFn: () => getTaskRuns({ data: { taskId } }),
	});
