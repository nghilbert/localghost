import { describe, expect, it } from "vitest";
import { sortSessionsByActivity } from "#/shared/domain/code-agent/session-activity";

function session(id: string, updatedAt: string) {
	return { id, title: id, workspacePath: `/srv/${id}`, updatedAt: new Date(updatedAt) };
}

describe("sortSessionsByActivity", () => {
	it("orders by the transcript's timestamp when it is newer than the row's", () => {
		const sessions = [session("a", "2026-01-01"), session("b", "2026-02-01")];
		const threadActivity = new Map([["a", new Date("2026-03-01")]]);

		expect(sortSessionsByActivity({ sessions, threadActivity }).map((s) => s.id)).toEqual([
			"a",
			"b",
		]);
	});

	it("keeps the row's own timestamp when the transcript is older", () => {
		const sessions = [session("a", "2026-03-01")];
		const threadActivity = new Map([["a", new Date("2026-01-01")]]);

		expect(sortSessionsByActivity({ sessions, threadActivity })[0]?.updatedAt).toEqual(
			new Date("2026-03-01"),
		);
	});

	it("tolerates a session that has no thread row yet", () => {
		const sessions = [session("a", "2026-01-01"), session("b", "2026-02-01")];

		expect(
			sortSessionsByActivity({ sessions, threadActivity: new Map() }).map((s) => s.id),
		).toEqual(["b", "a"]);
	});
});
