import type { z } from "zod/v4";
import { prisma } from "#/shared/lib/db.server";
import { normalizeModelId } from "#/shared/lib/utils";
import type { perModelOptionsSchema } from "./schemas";

/** The saved per-model overrides, or null when the model has none. */
export async function getModelSetting({
	endpointId,
	model,
	ownerId,
}: {
	endpointId: string;
	model: string;
	ownerId: string;
}) {
	const setting = await prisma.modelSetting.findFirst({
		where: { endpointId, model: normalizeModelId(model), ownerId },
	});
	return setting?.options as z.infer<typeof perModelOptionsSchema> | null | undefined;
}

/** Creates or replaces a model's saved overrides. */
export async function upsertModelSetting({
	endpointId,
	model,
	options,
	ownerId,
}: {
	endpointId: string;
	model: string;
	options: z.infer<typeof perModelOptionsSchema>;
	ownerId: string;
}) {
	const normalized = normalizeModelId(model);
	await prisma.modelSetting.upsert({
		where: { endpointId_model: { endpointId, model: normalized } },
		create: { endpointId, model: normalized, options, ownerId },
		update: { options },
	});
}

/** Clears a model's saved overrides, reverting it to the endpoint/user defaults. */
export async function deleteModelSetting({
	endpointId,
	model,
	ownerId,
}: {
	endpointId: string;
	model: string;
	ownerId: string;
}) {
	await prisma.modelSetting.deleteMany({
		where: { endpointId, model: normalizeModelId(model), ownerId },
	});
}
