/** A session as the list renders it, ordered by its most recent activity. */
export type CodeAgentSessionListItem = {
	id: string;
	title: string;
	workspacePath: string;
	updatedAt: Date;
};

/**
 * Orders sessions by whichever is later: the row's own edit or its transcript's. A
 * session with no thread row yet keeps its own timestamp.
 */
export function sortSessionsByActivity({
	sessions,
	threadActivity,
}: {
	sessions: CodeAgentSessionListItem[];
	threadActivity: Map<string, Date>;
}): CodeAgentSessionListItem[] {
	return sessions
		.map((session) => {
			const thread = threadActivity.get(session.id);
			return thread && thread > session.updatedAt ? { ...session, updatedAt: thread } : session;
		})
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
