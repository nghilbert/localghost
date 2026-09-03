import { db } from "#/prisma/db";
import { nowTimestamp } from "#/shared/lib/temporal";

/** Global chat defaults stored on the user row; null means unset (provider default). */
export async function findUserSettings({ ownerId }: { ownerId: string }) {
	const user = await db.orm.public.User.select("systemPrompt", "temperature").first({
		id: ownerId,
	});
	return {
		systemPrompt: user?.systemPrompt ?? null,
		temperature: user?.temperature ?? null,
	};
}

export async function saveUserSettings({
	ownerId,
	systemPrompt,
	temperature,
}: {
	ownerId: string;
	systemPrompt?: string | null;
	temperature?: number | null;
}) {
	return db.orm.public.User.select("systemPrompt", "temperature")
		.where({ id: ownerId })
		.update({
			systemPrompt: systemPrompt ?? null,
			temperature: temperature ?? null,
			updatedAt: nowTimestamp(),
		});
}
