import { z } from "zod/v4";

export const TAB_VALUES = ["account", "memory", "endpoints", "appearance"] as const;

export type TabValue = (typeof TAB_VALUES)[number];

export const settingsSearchSchema = z.object({
	tab: z.enum(TAB_VALUES).optional().catch(undefined),
});

export const accountFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	systemPrompt: z.string().max(10000),
	temperature: z.number().min(0).max(2),
});

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
