import { afterEach, describe, expect, it } from "vitest";
import { db } from "#/prisma/db";
import {
	findUserSettings,
	saveUserSettings,
} from "#/shared/domain/user-settings/user-settings.server";
import { nowTimestamp } from "#/shared/lib/temporal";

async function makeUser() {
	return db.orm.public.User.create({
		name: "Test",
		email: `test-${crypto.randomUUID()}@example.com`,
		updatedAt: nowTimestamp(),
	});
}

afterEach(async () => {
	await db.orm.public.User.where((u) => u.email.like("test-%@example.com")).deleteAndCount();
});

describe("findUserSettings", () => {
	it("defaults to null on a fresh user row", async () => {
		const user = await makeUser();
		expect(await findUserSettings({ ownerId: user.id })).toEqual({
			systemPrompt: null,
			temperature: null,
		});
	});

	it("returns unset defaults when the user row is gone", async () => {
		expect(await findUserSettings({ ownerId: crypto.randomUUID() })).toEqual({
			systemPrompt: null,
			temperature: null,
		});
	});

	it("passes stored values through unchanged", async () => {
		const user = await makeUser();
		await saveUserSettings({ ownerId: user.id, systemPrompt: "be terse", temperature: 0.5 });
		expect(await findUserSettings({ ownerId: user.id })).toEqual({
			systemPrompt: "be terse",
			temperature: 0.5,
		});
	});
});

describe("saveUserSettings", () => {
	it("defaults an omitted field to null instead of leaving it untouched", async () => {
		const user = await makeUser();
		await saveUserSettings({ ownerId: user.id, systemPrompt: "be terse" });
		expect(await findUserSettings({ ownerId: user.id })).toEqual({
			systemPrompt: "be terse",
			temperature: null,
		});
	});

	it("stores an explicit null to clear a previously set field", async () => {
		const user = await makeUser();
		await saveUserSettings({ ownerId: user.id, systemPrompt: "be terse", temperature: 0.7 });
		await saveUserSettings({ ownerId: user.id, systemPrompt: null, temperature: 0.7 });
		expect(await findUserSettings({ ownerId: user.id })).toEqual({
			systemPrompt: null,
			temperature: 0.7,
		});
	});
});
