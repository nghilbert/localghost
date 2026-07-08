import { z } from "zod/v4";

export const signUpSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.email(),
	password: z.string().min(8, "Password must be at least 8 characters"),
});
export const signUpDefaults: z.input<typeof signUpSchema> = {
	name: "",
	email: "",
	password: "",
};

export const signInSchema = z.object({
	email: z.email(),
	password: z.string().min(1, "Password is required"),
});
export const signInDefaults: z.input<typeof signInSchema> = {
	email: "",
	password: "",
};
