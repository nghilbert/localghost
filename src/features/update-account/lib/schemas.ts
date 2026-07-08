import { z } from "zod/v4";

export const accountFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	systemPrompt: z.string().max(10000),
});
