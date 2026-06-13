import { z } from "zod/v4";

const splitList = (input: string): string[] =>
	input
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);

// Form draft shape — comma-separated text inputs for emails/phones.
export const CreateContactFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	emailsInput: z.string(),
	phonesInput: z.string(),
	notes: z.string(),
});

export const createContactDefaults: z.infer<typeof CreateContactFormSchema> = {
	name: "",
	emailsInput: "",
	phonesInput: "",
	notes: "",
};

// Server input — what the server fn validates and the DB receives.
export const createContactInput = z.object({
	name: z.string().min(1),
	emails: z.array(z.string()).default([]),
	phones: z.array(z.string()).default([]),
	notes: z.string().optional(),
});

export const updateContactInput = z.object({
	id: z.uuid(),
	name: z.string().min(1).optional(),
	emails: z.array(z.string()).optional(),
	phones: z.array(z.string()).optional(),
	notes: z.string().nullish(),
});

export const deleteContactInput = z.object({ id: z.uuid() });

export const searchContactsInput = z.object({ query: z.string() });

// Bridge the form draft into server input.
export const toCreateContactInput = (
	value: z.infer<typeof CreateContactFormSchema>,
): z.infer<typeof createContactInput> => ({
	name: value.name.trim(),
	emails: splitList(value.emailsInput),
	phones: splitList(value.phonesInput),
	notes: value.notes || undefined,
});
