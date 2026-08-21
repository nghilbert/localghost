import { z } from "zod/v4";

/** The credentials better-auth takes. The sign-up form collects one field more. */
export const signUpSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.email(),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpFormSchema = signUpSchema
	.extend({ confirmPassword: z.string().min(1, "Please confirm your password") })
	.refine((value) => value.password === value.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export const signUpDefaults: z.input<typeof signUpFormSchema> = {
	name: "",
	email: "",
	password: "",
	confirmPassword: "",
};

export const signInSchema = z.object({
	email: z.email(),
	password: z.string().min(1, "Password is required"),
});
export const signInDefaults: z.input<typeof signInSchema> = {
	email: "",
	password: "",
};
