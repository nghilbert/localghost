import type { ModelMessage } from "@tanstack/ai";
import cron from "node-cron";
import { decrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { callLLM } from "#/lib/llm.server";

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

	// Auto-archive inactive conversations daily at 03:00
	cron.schedule("0 3 * * *", () => {
		archiveInactiveConversations().catch((e) =>
			console.error("[scheduler] conversation cleanup error:", e),
		);
	});
}

async function archiveInactiveConversations(): Promise<void> {
	const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	// A still-default title means the conversation never had a first exchange
	// (auto-naming renames after the first turn), so those are left untouched.
	const result = await prisma.conversation.updateMany({
		where: {
			archived: false,
			updatedAt: { lt: cutoff },
			title: { not: "New Chat" },
		},
		data: { archived: true },
	});
	if (result.count > 0) {
		console.log(`[scheduler] archived ${result.count} inactive conversations`);
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

/**
 * Runs a single scheduled task: records a TaskRun, performs its work (for `llm`
 * tasks, streams a completion from the owner's most recent endpoint and optionally
 * saves the output to the linked chat session), then advances the task's next run.
 * Failures are recorded on the TaskRun rather than thrown.
 */
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
				const conversation = task.sessionId
					? await prisma.conversation.findFirst({ where: { id: task.sessionId } })
					: null;
				const model = conversation?.model ?? "gpt-4o";

				const messages: ModelMessage[] = [{ role: "user", content: task.prompt }];
				output = await callLLM({ url: endpoint.url, apiKey, model, messages });

				// Append the output as an assistant message in the linked conversation's
				// UIMessage[] blob (the framework's native persistence shape).
				if (conversation && output) {
					const assistantMessage = {
						id: crypto.randomUUID(),
						role: "assistant",
						parts: [{ type: "text", content: `**Scheduled task: ${task.name}**\n\n${output}` }],
					};
					const existing = Array.isArray(conversation.messages) ? conversation.messages : [];
					await prisma.conversation.update({
						where: { id: conversation.id },
						data: { messages: [...existing, assistantMessage] },
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
