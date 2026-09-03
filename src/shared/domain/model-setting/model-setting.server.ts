import type { z } from "zod/v4";
import { db } from "#/prisma/db";
import { nowTimestamp } from "#/shared/lib/temporal";
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
	const setting = await db.orm.public.ModelSetting.where({ endpointId, model, ownerId }).first();
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
	return db.orm.public.ModelSetting.where({ ownerId })
		.select("model", "options")
		.include("endpoint", (e) => e.select("url", "name", "provider"))
		.all();
}

/**
 * Creates or replaces a model's saved overrides.
 * @throws If the endpoint isn't owned by the user. The `(endpointId, model)`
 * unique key carries no owner, so ownership is checked before the write.
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
	const { owned } = await db.orm.public.Endpoint.where({ id: endpointId, ownerId }).aggregate(
		(a) => ({ owned: a.count() }),
	);
	if (owned === 0) throw new Error("Not found");
	// `.upsert()` only targets a conflict on the primary key; `(endpointId, model)`
	// is a secondary unique constraint, so it can't detect the conflict there and
	// would attempt a raw insert. Check-then-write instead.
	const existing = await db.orm.public.ModelSetting.select("id")
		.where({ endpointId, model })
		.first();
	if (existing) {
		await db.orm.public.ModelSetting.where({ id: existing.id }).update({
			options,
			updatedAt: nowTimestamp(),
		});
	} else {
		await db.orm.public.ModelSetting.create({
			endpointId,
			model,
			options,
			ownerId,
			updatedAt: nowTimestamp(),
		});
	}
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
	await db.orm.public.ModelSetting.where({ endpointId, model, ownerId }).deleteAndCount();
}
