import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { decrypt, encrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";
import { fetchMessage, listMessages } from "#/lib/imap.server";
import { sendMail } from "#/lib/smtp.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

// ── Account management ────────────────────────────────────────────────────

export const getEmailAccounts = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.emailAccount.findMany({
		where: { ownerId: userId },
		select: {
			id: true,
			name: true,
			fromAddress: true,
			isDefault: true,
			enabled: true,
			imapHost: true,
			imapPort: true,
			imapUser: true,
			imapStarttls: true,
			smtpHost: true,
			smtpPort: true,
			smtpSecurity: true,
			smtpUser: true,
		},
	});
});

export const createEmailAccount = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
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
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const isFirst = (await prisma.emailAccount.count({ where: { ownerId: userId } })) === 0;

		return prisma.emailAccount.create({
			data: {
				name: data.name,
				fromAddress: data.fromAddress,
				isDefault: isFirst,
				imapHost: data.imapHost,
				imapPort: data.imapPort,
				imapUser: data.imapUser,
				imapPasswordEncrypted: encrypt(data.imapPassword),
				imapStarttls: data.imapStarttls,
				smtpHost: data.smtpHost,
				smtpPort: data.smtpPort,
				smtpSecurity: data.smtpSecurity,
				smtpUser: data.smtpUser || data.imapUser,
				smtpPasswordEncrypted: encrypt(data.smtpPassword || data.imapPassword),
				ownerId: userId,
			},
		});
	});

export const deleteEmailAccount = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.emailAccount.deleteMany({ where: { id: data.id, ownerId: userId } });
	});

// ── Message fetching ──────────────────────────────────────────────────────

export const listEmails = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			accountId: z.uuid(),
			folder: z.string().default("INBOX"),
			limit: z.number().default(50),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const account = await prisma.emailAccount.findFirst({
			where: { id: data.accountId, ownerId: userId },
		});
		if (!account) throw new Error("Account not found");

		return listMessages(
			{
				host: account.imapHost,
				port: account.imapPort,
				user: account.imapUser,
				passwordEncrypted: account.imapPasswordEncrypted,
				starttls: account.imapStarttls,
			},
			data.folder,
			data.limit,
		);
	});

export const getEmail = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({ accountId: z.uuid(), uid: z.string(), folder: z.string().default("INBOX") }),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const account = await prisma.emailAccount.findFirst({
			where: { id: data.accountId, ownerId: userId },
		});
		if (!account) throw new Error("Account not found");

		return fetchMessage(
			{
				host: account.imapHost,
				port: account.imapPort,
				user: account.imapUser,
				passwordEncrypted: account.imapPasswordEncrypted,
				starttls: account.imapStarttls,
			},
			data.uid,
			data.folder,
		);
	});

export const sendEmail = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			accountId: z.uuid(),
			to: z.string().min(1),
			subject: z.string().min(1),
			text: z.string().min(1),
			html: z.string().optional(),
			replyTo: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const account = await prisma.emailAccount.findFirst({
			where: { id: data.accountId, ownerId: userId },
		});
		if (!account) throw new Error("Account not found");

		// Verify the password is decryptable before trying to send
		const password = decrypt(account.smtpPasswordEncrypted);
		if (!password) throw new Error("SMTP password could not be decrypted");

		await sendMail(
			{
				host: account.smtpHost,
				port: account.smtpPort,
				security: account.smtpSecurity,
				user: account.smtpUser,
				passwordEncrypted: account.smtpPasswordEncrypted,
				fromAddress: account.fromAddress,
			},
			{
				to: data.to,
				subject: data.subject,
				text: data.text,
				html: data.html,
				replyTo: data.replyTo,
			},
		);
	});

export const emailAccountsQueryOptions = () =>
	queryOptions({ queryKey: ["email-accounts"], queryFn: () => getEmailAccounts() });
