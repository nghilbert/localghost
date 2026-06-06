import cron from "node-cron";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { type LLMMessage, streamLLM } from "#/lib/llm.server";

let initialized = false;

/**
 * Start watching for due tasks. Call once at server startup.
 * Polls the DB every minute; also registers explicit cron jobs when tasks have
 * a cronExpression.
 */
export function initScheduler() {
	if (initialized) return;
	initialized = true;

	// Poll every minute for due tasks
	cron.schedule("* * * * *", () => {
		runDueTasks().catch((e) => console.error("[scheduler] poll error:", e));
	});

	// Auto-archive inactive sessions daily at 03:00
	cron.schedule("0 3 * * *", () => {
		archiveInactiveSessions().catch((e) => console.error("[scheduler] session cleanup error:", e));
	});
}

async function archiveInactiveSessions(): Promise<void> {
	const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const result = await prisma.chatSession.updateMany({
		where: {
			archived: false,
			lastAccessedAt: { lt: cutoff },
			messageCount: { gt: 0 },
			name: { not: "New Chat" },
		},
		data: { archived: true },
	});
	if (result.count > 0) {
		console.log(`[scheduler] archived ${result.count} inactive sessions`);
	}
}

async function runDueTasks() {
	const now = new Date();
	const dueTasks = await prisma.scheduledTask.findMany({
		where: {
			status: "active",
			nextRun: { lte: now },
		},
		include: { owner: true },
	});

	for (const task of dueTasks) {
		executeTask(task).catch((e) => console.error(`[scheduler] task ${task.id} error:`, e));
	}
}

/** Fetch a task by ID and execute it immediately. Used by runTaskNow. */
export async function executeTaskById(id: string): Promise<void> {
	const task = await prisma.scheduledTask.findFirst({ where: { id } });
	if (!task) throw new Error("Task not found");
	await executeTask(task);
}

async function executeTask(task: {
	id: string;
	name: string;
	prompt: string | null;
	taskType: string;
	schedule: string;
	scheduledTime: string | null;
	cronExpression: string | null;
	sessionId: string | null;
	ownerId: string;
	runCount: number;
}) {
	const run = await prisma.taskRun.create({
		data: { taskId: task.id, status: "running" },
	});

	try {
		let output = "";

		if (task.taskType === "llm" && task.prompt) {
			// Find the user's most recently used endpoint
			const endpoint = await prisma.modelEndpoint.findFirst({
				where: { ownerId: task.ownerId },
				orderBy: { updatedAt: "desc" },
			});

			if (endpoint) {
				const apiKey = endpoint.apiKeyEncrypted ? decrypt(endpoint.apiKeyEncrypted) : undefined;
				const session = task.sessionId
					? await prisma.chatSession.findFirst({ where: { id: task.sessionId } })
					: null;
				const model = session?.model ?? "gpt-4o";

				const messages: LLMMessage[] = [{ role: "user", content: task.prompt }];
				const stream = await streamLLM({ url: endpoint.url, apiKey, model, messages });
				const reader = stream.getReader();

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					if (value.type === "delta") output += value.delta;
				}

				// Save output as a message in the linked session
				if (task.sessionId && output) {
					await prisma.chatMessage.create({
						data: {
							sessionId: task.sessionId,
							role: "assistant",
							content: `**Scheduled task: ${task.name}**\n\n${output}`,
						},
					});
				}
			}
		}

		await prisma.taskRun.update({
			where: { id: run.id },
			data: { status: "success", output, finishedAt: new Date() },
		});

		await prisma.scheduledTask.update({
			where: { id: task.id },
			data: {
				lastRun: new Date(),
				runCount: { increment: 1 },
				nextRun: computeNextRun(task.schedule, task.scheduledTime, task.cronExpression),
				status: task.schedule === "once" ? "completed" : "active",
			},
		});
	} catch (err) {
		await prisma.taskRun.update({
			where: { id: run.id },
			data: {
				status: "error",
				error: err instanceof Error ? err.message : String(err),
				finishedAt: new Date(),
			},
		});
	}
}

/** Compute the next run datetime given the task schedule settings. */
export function computeNextRun(
	schedule: string,
	scheduledTime: string | null,
	cronExpression: string | null,
): Date | null {
	const now = new Date();

	if (schedule === "once") return null;

	if (schedule === "cron" && cronExpression) {
		// Find next fire time from cron expression (approximate: add 1 min to avoid same-tick)
		const next = new Date(now.getTime() + 60_000);
		return next;
	}

	const [h, m] = (scheduledTime ?? "09:00").split(":").map(Number);

	const next = new Date(now);
	next.setUTCHours(h ?? 9, m ?? 0, 0, 0);

	if (schedule === "daily") {
		if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
		return next;
	}

	if (schedule === "weekly") {
		while (next <= now || next.getUTCDay() !== 1) {
			next.setUTCDate(next.getUTCDate() + 1);
		}
		return next;
	}

	if (schedule === "monthly") {
		next.setUTCDate(1);
		if (next <= now) next.setUTCMonth(next.getUTCMonth() + 1);
		return next;
	}

	return null;
}
