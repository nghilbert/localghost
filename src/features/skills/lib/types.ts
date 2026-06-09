export type Skill = {
	id: string;
	name: string;
	description: string;
	content: string;
	updatedAt: Date | string;
};

export type SkillDraft = Omit<Skill, "id" | "updatedAt">;

export const BLANK_SKILL: SkillDraft = { name: "", description: "", content: "" };
