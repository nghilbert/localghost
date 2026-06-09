export const SCHEDULE_LABELS: Record<string, string> = {
	once: "Once",
	daily: "Daily",
	weekly: "Weekly",
	monthly: "Monthly",
	cron: "Custom cron",
};

export type TaskRun = {
	id: string;
	status: string;
	startedAt: Date;
	finishedAt: Date | null;
	error: string | null;
	output?: string | null;
};

export type Task = {
	id: string;
	name: string;
	prompt: string | null;
	schedule: string;
	status: string;
	runCount: number;
	nextRun: Date | null;
	runs: TaskRun[];
};
