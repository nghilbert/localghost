import { prisma } from "#/lib/db.server";

type ManageSkillsArgs = {
	action: "list" | "read" | "add" | "update" | "delete";
	id?: string;
	name?: string;
	description?: string;
	content?: string;
};

async function findSkill(idOrPrefix: string, ownerId: string) {
	if (idOrPrefix.length === 36) {
		return prisma.skill.findFirst({ where: { id: idOrPrefix, ownerId } });
	}
	const all = await prisma.skill.findMany({ where: { ownerId } });
	return all.find((s) => s.id.startsWith(idOrPrefix)) ?? null;
}

export async function manageSkills(args: ManageSkillsArgs, ownerId: string): Promise<string> {
	switch (args.action) {
		case "list": {
			const skills = await prisma.skill.findMany({
				where: { ownerId },
				orderBy: { updatedAt: "desc" },
				take: 20,
			});
			if (!skills.length) return "No skills saved yet.";
			return skills
				.map(
					(s) =>
						`[${s.id.slice(0, 8)}] **${s.name}**${s.description ? ` — ${s.description}` : ""}\n${s.content.slice(0, 200)}${s.content.length > 200 ? "…" : ""}`,
				)
				.join("\n\n");
		}

		case "read": {
			if (!args.id) return "Error: id required for read";
			const skill = await findSkill(args.id, ownerId);
			if (!skill) return `Skill not found: ${args.id}`;
			return `**${skill.name}**${skill.description ? `\n${skill.description}` : ""}\n\n${skill.content}`;
		}

		case "add": {
			if (!args.name?.trim()) return "Error: name required for add";
			if (!args.content?.trim()) return "Error: content required for add";
			const skill = await prisma.skill.create({
				data: {
					name: args.name.trim(),
					description: args.description?.trim() ?? "",
					content: args.content.trim(),
					ownerId,
				},
			});
			return `Skill created: "${skill.name}" (${skill.id.slice(0, 8)})`;
		}

		case "update": {
			if (!args.id) return "Error: id required for update";
			const skill = await findSkill(args.id, ownerId);
			if (!skill) return `Skill not found: ${args.id}`;
			await prisma.skill.update({
				where: { id: skill.id },
				data: {
					...(args.name !== undefined ? { name: args.name.trim() } : {}),
					...(args.description !== undefined ? { description: args.description.trim() } : {}),
					...(args.content !== undefined ? { content: args.content.trim() } : {}),
				},
			});
			return `Skill updated: "${args.name ?? skill.name}"`;
		}

		case "delete": {
			if (!args.id) return "Error: id required for delete";
			const skill = await findSkill(args.id, ownerId);
			if (!skill) return `Skill not found: ${args.id}`;
			await prisma.skill.delete({ where: { id: skill.id } });
			return `Skill deleted: "${skill.name}"`;
		}

		default:
			return `Unknown action: ${(args as ManageSkillsArgs).action}`;
	}
}
