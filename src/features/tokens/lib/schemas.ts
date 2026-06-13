import { z } from "zod/v4";

export const createTokenInput = z.object({
	name: z.string().min(1).max(100),
	expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const deleteTokenInput = z.object({ id: z.uuid() });
