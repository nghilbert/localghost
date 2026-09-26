import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "#/lib/db.server";
import { createEndpoint, createUser, resetDb } from "#/test/db.server";
import { upsertModelSetting } from "./model-setting.server";

beforeEach(resetDb);

describe("upsertModelSetting", () => {
	// `endpointId` comes from the client and the upsert key has no owner, so ownership is checked first.
	it("checks the endpoint belongs to the caller before writing", async () => {
		const user = await createUser();
		const endpoint = await createEndpoint({ ownerId: user.id });

		await upsertModelSetting({
			endpointId: endpoint.id,
			model: "gpt-4o-mini",
			options: { temperature: 0.2 },
			ownerId: user.id,
		});

		const setting = await prisma.modelSetting.findUnique({
			where: { endpointId_model: { endpointId: endpoint.id, model: "gpt-4o-mini" } },
		});
		expect(setting?.options).toEqual({ temperature: 0.2 });
	});

	it("refuses to write when the endpoint is not the caller's", async () => {
		const owner = await createUser();
		const intruder = await createUser();
		const endpoint = await createEndpoint({ ownerId: owner.id });

		await expect(
			upsertModelSetting({
				endpointId: endpoint.id,
				model: "gpt-4o-mini",
				options: { temperature: 0.2 },
				ownerId: intruder.id,
			}),
		).rejects.toThrow("Not found");
		expect(await prisma.modelSetting.count({ where: { endpointId: endpoint.id } })).toBe(0);
	});
});
