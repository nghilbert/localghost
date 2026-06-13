import { z } from "zod/v4";

// ── Compose ───────────────────────────────────────────────────────────────

export const ComposeEmailFormSchema = z.object({
	to: z.email("Must be a valid email address"),
	subject: z.string().trim().min(1, "Subject is required"),
	body: z.string().trim().min(1, "Message is required"),
});

export const composeEmailDefaults = (replyTo?: {
	to: string;
	subject: string;
}): z.infer<typeof ComposeEmailFormSchema> => ({
	to: replyTo?.to ?? "",
	subject: replyTo ? `Re: ${replyTo.subject}` : "",
	body: "",
});

export const sendEmailInput = z.object({
	accountId: z.uuid(),
	to: z.string().min(1),
	subject: z.string().min(1),
	text: z.string().min(1),
	html: z.string().optional(),
	replyTo: z.string().optional(),
});

export const toSendEmailInput = (
	accountId: string,
	value: z.infer<typeof ComposeEmailFormSchema>,
): z.input<typeof sendEmailInput> => ({
	accountId,
	to: value.to,
	subject: value.subject,
	text: value.body,
});

// ── Account management ──────────────────────────────────────────────────────

const PortSchema = z
	.string()
	.regex(/^\d+$/, "Must be a number")
	.refine((port) => Number(port) >= 1 && Number(port) <= 65535, "Must be a valid port");

export const EmailAccountFormSchema = z.object({
	name: z.string().trim().min(1, "Account name is required"),
	fromAddress: z.email("Must be a valid email address"),
	imapHost: z.string().trim().min(1, "IMAP host is required"),
	imapPort: PortSchema,
	imapUser: z.string(),
	imapPassword: z.string(),
	smtpHost: z.string(),
	smtpPort: PortSchema,
	smtpSecurity: z.enum(["ssl", "starttls", "none"]),
	smtpUser: z.string(),
	smtpPassword: z.string(),
});

export const emailAccountDefaults: z.infer<typeof EmailAccountFormSchema> = {
	name: "",
	fromAddress: "",
	imapHost: "",
	imapPort: "993",
	imapUser: "",
	imapPassword: "",
	smtpHost: "",
	smtpPort: "465",
	smtpSecurity: "ssl",
	smtpUser: "",
	smtpPassword: "",
};

export const createEmailAccountInput = z.object({
	name: z.string().min(1),
	fromAddress: z.string().default(""),
	imapHost: z.string().min(1),
	imapPort: z.number().int().default(993),
	imapUser: z.string().min(1),
	imapPassword: z.string().min(1),
	imapStarttls: z.boolean().default(true),
	smtpHost: z.string().min(1),
	smtpPort: z.number().int().default(465),
	smtpSecurity: z.enum(["ssl", "starttls", "none"]).default("ssl"),
	smtpUser: z.string().default(""),
	smtpPassword: z.string().default(""),
});

export const toCreateEmailAccountInput = (
	value: z.infer<typeof EmailAccountFormSchema>,
): z.input<typeof createEmailAccountInput> => ({
	name: value.name.trim(),
	fromAddress: value.fromAddress.trim(),
	imapHost: value.imapHost.trim(),
	imapPort: Number(value.imapPort),
	imapUser: value.imapUser,
	imapPassword: value.imapPassword,
	smtpHost: value.smtpHost.trim(),
	smtpPort: Number(value.smtpPort),
	smtpSecurity: value.smtpSecurity,
	smtpUser: value.smtpUser,
	smtpPassword: value.smtpPassword,
});

export const deleteEmailAccountInput = z.object({ id: z.uuid() });

export const listEmailsInput = z.object({
	accountId: z.uuid(),
	folder: z.string().default("INBOX"),
	limit: z.number().default(50),
});

export const getEmailInput = z.object({
	accountId: z.uuid(),
	uid: z.string(),
	folder: z.string().default("INBOX"),
});
