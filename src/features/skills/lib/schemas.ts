import { z } from "zod/v4";

export const createSkillInput = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	content: z.string().min(1).max(20000),
});

export const updateSkillInput = z.object({
	id: z.uuid(),
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	content: z.string().min(1).max(20000).optional(),
});

export const skillIdInput = z.object({ id: z.uuid() });
