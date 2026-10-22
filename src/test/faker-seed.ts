import { faker } from "@faker-js/faker";
import { beforeEach } from "vitest";

/** FNV-1a, so a test's name always maps to the same seed. */
function hash(text: string): number {
	let value = 0x81_1c_9d_c5;
	for (const char of text) {
		value ^= char.codePointAt(0) ?? 0;
		value = Math.imul(value, 0x01_00_01_93);
	}
	return value >>> 0;
}

/**
 * Setup file for every project: seeds faker from the test's name and pins the date faker
 * counts from, so each test gets the same data on every run and a failure reproduces.
 */
faker.setDefaultRefDate("2026-01-01T00:00:00.000Z");
beforeEach(({ task }) => {
	faker.seed(hash(task.fullName));
});
