import { afterEach, describe, expect, it } from "vitest";
import { db } from "#/prisma/db";
import {
	getModelSetting,
	upsertModelSetting,
} from "#/shared/domain/model-setting/model-setting.server";
import { nowTimestamp } from "#/shared/lib/temporal";

async function makeOwnerAndEndpoint() {
	const owner = await db.orm.public.User.create({
		name: "Test",
		email: `test-${crypto.randomUUID()}@example.com`,
		updatedAt: nowTimestamp(),
	});
	const endpoint = await db.orm.public.Endpoint.create({
		name: "Test Endpoint",
		url: "http://localhost",
		provider: "openai",
		ownerId: owner.id,
		updatedAt: nowTimestamp(),
	});
	return { owner, endpoint };
}

afterEach(async () => {
	await db.orm.public.User.where((u) => u.email.like("test-%@example.com")).deleteAndCount();
});

describe("upsertModelSetting", () => {
	// The unique key this upserts on is (endpointId, model), which carries no
	// owner, and endpointId comes from the client. Without the pre-check a user
	// could pass someone else's endpoint id and overwrite their saved options.
	it("checks the endpoint belongs to the caller before writing", async () => {
		const { owner, endpoint } = await makeOwnerAndEndpoint();

		await upsertModelSetting({
			endpointId: endpoint.id,
			model: "gpt-4o-mini",
			options: { temperature: 0.2 },
			ownerId: owner.id,
		});

		expect(
			await getModelSetting({ endpointId: endpoint.id, model: "gpt-4o-mini", ownerId: owner.id }),
		).toEqual({ temperature: 0.2 });
	});

	it("refuses to write when the endpoint is not the caller's", async () => {
		const { endpoint } = await makeOwnerAndEndpoint();
		const otherOwner = await db.orm.public.User.create({
			name: "Other",
			email: `test-${crypto.randomUUID()}@example.com`,
			updatedAt: nowTimestamp(),
		});

		await expect(
			upsertModelSetting({
				endpointId: endpoint.id,
				model: "gpt-4o-mini",
				options: { temperature: 0.2 },
				ownerId: otherOwner.id,
			}),
		).rejects.toThrow("Not found");
		expect(
			await getModelSetting({
				endpointId: endpoint.id,
				model: "gpt-4o-mini",
				ownerId: otherOwner.id,
			}),
		).toBeUndefined();
	});
});
