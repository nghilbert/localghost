import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser, resetDb } from "#/test/db.server";
import { findUserSettings, saveUserSettings } from "./user.server";

beforeEach(resetDb);

describe("findUserSettings", () => {
	it("null-coalesces unset fields on the user row", async () => {
		const user = await createUser();

		expect(await findUserSettings({ ownerId: user.id })).toEqual({
			systemPrompt: null,
			temperature: null,
		});
	});

	it("returns unset defaults when the user row is gone", async () => {
		expect(await findUserSettings({ ownerId: randomUUID() })).toEqual({
			systemPrompt: null,
			temperature: null,
		});
	});

	it("passes stored values through unchanged", async () => {
		const user = await createUser({ systemPrompt: "be terse", temperature: 0.5 });

		expect(await findUserSettings({ ownerId: user.id })).toEqual({
			systemPrompt: "be terse",
			temperature: 0.5,
		});
	});
});

describe("saveUserSettings", () => {
	it("defaults an omitted field to null instead of leaving it untouched", async () => {
		const user = await createUser({ temperature: 0.9 });

		const result = await saveUserSettings({ ownerId: user.id, systemPrompt: "be terse" });

		expect(result).toEqual({ systemPrompt: "be terse", temperature: null });
	});

	it("stores an explicit null to clear a previously set field", async () => {
		const user = await createUser({ systemPrompt: "old prompt" });

		const result = await saveUserSettings({
			ownerId: user.id,
			systemPrompt: null,
			temperature: 0.7,
		});

		expect(result).toEqual({ systemPrompt: null, temperature: 0.7 });
	});
});
