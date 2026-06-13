import { z } from "zod/v4";

export const CATEGORY_VALUES = ["fact", "preference", "contact", "project", "instruction"] as const;

export const AddMemoryFormSchema = z.object({
	text: z.string().trim().min(1, "Memory text is required"),
	category: z.enum(CATEGORY_VALUES),
});

export const addMemoryDefaults: z.infer<typeof AddMemoryFormSchema> = {
	text: "",
	category: "fact",
};

export const addMemoryInput = z.object({
	text: z.string().min(1),
	category: z.enum(CATEGORY_VALUES).default("fact"),
});

export const deleteMemoryInput = z.object({ id: z.uuid() });

export const searchMemoriesInput = z.object({
	query: z.string().min(1),
	limit: z.number().default(10),
});

export const toAddMemoryInput = (
	value: z.infer<typeof AddMemoryFormSchema>,
): z.input<typeof addMemoryInput> => ({
	text: value.text.trim(),
	category: value.category,
});
