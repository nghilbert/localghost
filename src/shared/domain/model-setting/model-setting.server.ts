import type { z } from "zod/v4";
import { prisma } from "#/shared/lib/db.server";
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
	const setting = await prisma.modelSetting.findFirst({ where: { endpointId, model, ownerId } });
	return setting?.options as z.infer<typeof perModelOptionsSchema> | null | undefined;
}

/**
 * Every saved per-model override for a user, each tagged with the owning
 * endpoint's portable identity (url + provider) so a backup can re-attach it to
 * a re-created endpoint on another instance where the endpoint id differs.
 */
export async function listModelSettings({ ownerId }: { ownerId: string }) {
	return prisma.modelSetting.findMany({
		where: { ownerId },
		select: {
			model: true,
			options: true,
			endpoint: { select: { url: true, name: true, provider: true } },
		},
	});
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
	await prisma.modelSetting.upsert({
		where: { endpointId_model: { endpointId, model } },
		create: { endpointId, model, options, ownerId },
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
	await prisma.modelSetting.deleteMany({ where: { endpointId, model, ownerId } });
}
