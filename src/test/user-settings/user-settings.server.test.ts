import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique, userUpdate } = vi.hoisted(() => ({
	userFindUnique: vi.fn(),
	userUpdate: vi.fn(),
}));

vi.mock("#/shared/lib/db.server", () => ({
	prisma: { user: { findUnique: userFindUnique, update: userUpdate } },
}));

import {
	findUserSettings,
	saveUserSettings,
} from "#/shared/domain/user-settings/user-settings.server";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("findUserSettings", () => {
	it("null-coalesces unset fields on the user row", async () => {
		userFindUnique.mockResolvedValue({ systemPrompt: null, temperature: null });

		expect(await findUserSettings({ ownerId: "owner-1" })).toEqual({
			systemPrompt: null,
			temperature: null,
		});
	});

	it("returns unset defaults when the user row is gone", async () => {
		userFindUnique.mockResolvedValue(null);

		expect(await findUserSettings({ ownerId: "owner-1" })).toEqual({
			systemPrompt: null,
			temperature: null,
		});
	});

	it("passes stored values through unchanged", async () => {
		userFindUnique.mockResolvedValue({ systemPrompt: "be terse", temperature: 0.5 });

		expect(await findUserSettings({ ownerId: "owner-1" })).toEqual({
			systemPrompt: "be terse",
			temperature: 0.5,
		});
	});
});

describe("saveUserSettings", () => {
	it("defaults an omitted field to null instead of leaving it untouched", async () => {
		await saveUserSettings({ ownerId: "owner-1", systemPrompt: "be terse" });

		expect(userUpdate).toHaveBeenCalledWith({
			where: { id: "owner-1" },
			data: { systemPrompt: "be terse", temperature: null },
			select: { systemPrompt: true, temperature: true },
		});
	});

	it("stores an explicit null to clear a previously set field", async () => {
		await saveUserSettings({ ownerId: "owner-1", systemPrompt: null, temperature: 0.7 });

		expect(userUpdate).toHaveBeenCalledWith({
			where: { id: "owner-1" },
			data: { systemPrompt: null, temperature: 0.7 },
			select: { systemPrompt: true, temperature: true },
		});
	});
});
