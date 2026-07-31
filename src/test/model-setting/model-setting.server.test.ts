import { beforeEach, describe, expect, it, vi } from "vitest";

const { endpointCount, modelSettingUpsert } = vi.hoisted(() => ({
	endpointCount: vi.fn(),
	modelSettingUpsert: vi.fn(),
}));

vi.mock("#/shared/lib/db.server", () => ({
	prisma: {
		endpoint: { count: endpointCount },
		modelSetting: { upsert: modelSettingUpsert },
	},
}));

import { upsertModelSetting } from "#/shared/domain/model-setting/model-setting.server";

const setting = {
	endpointId: "endpoint-1",
	model: "gpt-4o-mini",
	options: { temperature: 0.2 },
	ownerId: "owner-1",
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("upsertModelSetting", () => {
	// The unique key this upserts on is (endpointId, model), which carries no
	// owner, and endpointId comes from the client. Without the pre-check a user
	// could pass someone else's endpoint id and overwrite their saved options.
	it("checks the endpoint belongs to the caller before writing", async () => {
		endpointCount.mockResolvedValue(1);

		await upsertModelSetting(setting);

		expect(endpointCount).toHaveBeenCalledWith({
			where: { id: "endpoint-1", ownerId: "owner-1" },
		});
		expect(modelSettingUpsert).toHaveBeenCalled();
	});

	it("refuses to write when the endpoint is not the caller's", async () => {
		endpointCount.mockResolvedValue(0);

		await expect(upsertModelSetting(setting)).rejects.toThrow("Not found");
		expect(modelSettingUpsert).not.toHaveBeenCalled();
	});
});
