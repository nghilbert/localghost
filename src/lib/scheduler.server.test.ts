import { afterEach, describe, expect, it, vi } from "vitest";
import { computeNextRun } from "./scheduler.server";

afterEach(() => {
	vi.useRealTimers();
});

function utcHHMM(date: Date) {
	return `${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}`;
}

describe("computeNextRun", () => {
	it("returns null for once schedule", () => {
		expect(computeNextRun("once", null, null)).toBeNull();
	});

	it("returns null for unknown schedule", () => {
		expect(computeNextRun("unknown", null, null)).toBeNull();
	});

	it("daily: returns today at scheduledTime when it is in the future", () => {
		vi.useFakeTimers({ now: new Date("2026-06-06T07:00:00Z") });
		const result = computeNextRun("daily", "09:00", null);
		expect(result).not.toBeNull();
		expect(utcHHMM(result as Date)).toBe("09:00");
		expect((result as Date).getUTCDate()).toBe(6);
	});

	it("daily: rolls to tomorrow when scheduledTime has already passed today", () => {
		vi.useFakeTimers({ now: new Date("2026-06-06T10:00:00Z") });
		const result = computeNextRun("daily", "09:00", null);
		expect(result).not.toBeNull();
		expect((result as Date).getUTCDate()).toBe(7);
	});

	it("weekly: returns a Monday", () => {
		vi.useFakeTimers({ now: new Date("2026-06-06T10:00:00Z") }); // Saturday
		const result = computeNextRun("weekly", "09:00", null);
		expect(result).not.toBeNull();
		expect((result as Date).getUTCDay()).toBe(1);
	});

	it("monthly: returns the 1st of the following month", () => {
		vi.useFakeTimers({ now: new Date("2026-06-15T10:00:00Z") });
		const result = computeNextRun("monthly", "09:00", null);
		expect(result).not.toBeNull();
		expect((result as Date).getUTCDate()).toBe(1);
		expect((result as Date).getUTCMonth()).toBe(6); // July
	});

	it("cron: returns a date ~1 minute in the future", () => {
		const now = new Date("2026-06-06T09:00:00Z");
		vi.useFakeTimers({ now });
		const result = computeNextRun("cron", null, "0 9 * * *");
		expect(result).not.toBeNull();
		const diff = (result as Date).getTime() - now.getTime();
		expect(diff).toBeGreaterThan(0);
		expect(diff).toBeLessThanOrEqual(120_000);
	});

	it("defaults to 09:00 when scheduledTime is null", () => {
		vi.useFakeTimers({ now: new Date("2026-06-06T07:00:00Z") });
		const result = computeNextRun("daily", null, null);
		expect(utcHHMM(result as Date)).toBe("09:00");
	});
});
