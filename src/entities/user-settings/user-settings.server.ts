import { prisma } from "#/shared/lib/db.server";

/** Global chat defaults stored on the user row; null means unset (provider default). */
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
