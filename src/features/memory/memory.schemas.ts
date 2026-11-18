import { z } from "zod";

/** A memory's text. */
export const memoryTextInput = z.object({
	text: z.string().trim().min(1, "Memory text is required").max(2000),
});

/** A memory id and its new text. */
export const updateMemoryInput = memoryTextInput.extend({ id: z.uuid() });

/** Identifies a memory. */
export const memoryIdInput = z.object({ id: z.uuid() });
