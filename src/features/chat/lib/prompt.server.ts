import { prisma } from "#/lib/db.server";

/**
 * Builds the effective system prompt for a chat run: the user's base prompt with
 * their most recent skills folded in as a reference block. Skills are always
 * available to the model (unlike opt-in tools) so it can apply a saved procedure
 * without the user re-toggling it each send. Returns `undefined` when there's no
 * base prompt and no skills, so the LLM call omits the system message entirely.
 */
export async function buildSystemPrompt(
	userId: string,
	basePrompt?: string,
): Promise<string | undefined> {
	const skills = await prisma.skill.findMany({
		where: { ownerId: userId },
		orderBy: { updatedAt: "desc" },
		take: 5,
	});
	if (skills.length === 0) return basePrompt;

	const skillBlock =
		"## Your Skills\n" +
		skills
			.map((s) => `### ${s.name}${s.description ? `\n${s.description}` : ""}\n${s.content}`)
			.join("\n\n");
	return basePrompt ? `${basePrompt}\n\n${skillBlock}` : skillBlock;
}
