import { prisma } from "#/lib/db.server";

/** The user's chat defaults. Null means unset. */
export async function findUserSettings({ ownerId }: { ownerId: string }) {
	const user = await prisma.user.findUnique({
		where: { id: ownerId },
		select: { systemPrompt: true, temperature: true },
	});
	return {
		systemPrompt: user?.systemPrompt ?? null,
		temperature: user?.temperature ?? null,
	};
}

/** Saves the user's chat defaults. */
export async function saveUserSettings({
	ownerId,
	systemPrompt,
	temperature,
}: {
	ownerId: string;
	systemPrompt?: string | null;
	temperature?: number | null;
}) {
	return prisma.user.update({
		where: { id: ownerId },
		data: { systemPrompt: systemPrompt ?? null, temperature: temperature ?? null },
		select: { systemPrompt: true, temperature: true },
	});
}
