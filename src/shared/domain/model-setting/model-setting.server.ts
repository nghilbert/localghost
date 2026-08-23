import type { z } from "zod/v4";
import { prisma } from "#/shared/lib/db.server";
import { perModelOptionsSchema } from "./schemas";

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
	if (!setting) return undefined;
	if (setting.options == null) return null;
	return perModelOptionsSchema.parse(setting.options);
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

/**
 * Creates or replaces a model's saved overrides.
 * @throws If the endpoint isn't owned by the user. The unique key this upserts
 * on is `(endpointId, model)`, which carries no owner, so the caller's claim to
 * the endpoint has to be checked before the write rather than inside it.
 */
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
	const owned = await prisma.endpoint.count({ where: { id: endpointId, ownerId } });
	if (owned === 0) throw new Error("Not found");
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
