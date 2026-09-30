import { z } from "zod";

/** The sign-up fields better-auth takes. */
export const signUpSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.email(),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

/** The sign-up form, which adds a password confirmation. */
export const signUpFormSchema = signUpSchema
	.extend({ confirmPassword: z.string().min(1, "Please confirm your password") })
	.refine((value) => value.password === value.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

/** Empty sign-up form values. */
export const signUpDefaults: z.input<typeof signUpFormSchema> = {
	name: "",
	email: "",
	password: "",
	confirmPassword: "",
};

/** The sign-in form. */
export const signInSchema = z.object({
	email: z.email(),
	password: z.string().min(1, "Password is required"),
});

/** Empty sign-in form values. */
export const signInDefaults: z.input<typeof signInSchema> = {
	email: "",
	password: "",
};

/** The account settings form. */
export const accountFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	systemPrompt: z.string().max(10000),
	temperature: z.number().min(0).max(2),
});

/** The chat defaults the account form saves. An empty system prompt is sent as null. */
export const userSettingsInput = accountFormSchema.pick({ temperature: true }).extend({
	systemPrompt: accountFormSchema.shape.systemPrompt.nullable(),
});

/** The change password form. */
export const changePasswordFormSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z.string().min(8, "New password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your new password"),
	})
	.refine((value) => value.newPassword === value.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});
