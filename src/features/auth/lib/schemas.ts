import { z } from "zod";

export const SignUpSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.email(),
	password: z.string().min(8, "Password must be at least 8 characters"),
});
export const SignUpDefaults: z.input<typeof SignUpSchema> = {
	name: "",
	email: "",
	password: "",
};

export const SignInSchema = z.object({
	email: z.email(),
	password: z.string().min(1, "Password is required"),
});
export const SignInDefaults: z.input<typeof SignInSchema> = {
	email: "",
	password: "",
};
