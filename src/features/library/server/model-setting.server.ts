import type { z } from "zod";
import { endpointOwnedBy } from "#/features/endpoint/server/endpoint.server";
import { perModelOptionsSchema } from "#/features/library/library.schemas";
import { prisma } from "#/lib/db.server";

/** A model's saved overrides: undefined without a row, null when the row has no options. */
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

/** Every model setting a user has, with its endpoint's url, name, and provider for backups. */
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

/** Every model the user has overrides for, with its endpoint's name, sorted by endpoint then model. */
export async function findModelSettings({ ownerId }: { ownerId: string }) {
	const settings = await prisma.modelSetting.findMany({
		where: { ownerId },
		orderBy: [{ endpoint: { name: "asc" } }, { model: "asc" }],
		select: { endpointId: true, model: true, options: true, endpoint: { select: { name: true } } },
	});
	return settings.map(({ endpointId, model, options, endpoint }) => ({
		endpointId,
		endpointName: endpoint.name,
		model,
		options: perModelOptionsSchema.parse(options ?? {}),
	}));
}

/**
 * Creates or replaces a model's saved overrides. The upsert key has no owner, so
 * endpoint ownership is checked first.
 * @throws If the user does not own the endpoint.
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
	if (!(await endpointOwnedBy({ id: endpointId, ownerId }))) throw new Error("Not found");
	await prisma.modelSetting.upsert({
		where: { endpointId_model: { endpointId, model } },
		create: { endpointId, model, options, ownerId },
		update: { options },
	});
}

/** Deletes a model's saved overrides, so the endpoint and user defaults apply. */
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
