import { z } from "zod/v4";

/** One memory's text; shared by the Settings add/edit forms and the server fn inputs. */
export const memoryTextInput = z.object({
	text: z.string().trim().min(1, "Memory text is required").max(2000),
});

export const updateMemoryInput = memoryTextInput.extend({ id: z.uuid() });

export const memoryIdInput = z.object({ id: z.uuid() });
