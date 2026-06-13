import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/features/auth/lib/auth.server";
import {
	createEmailAccountInput,
	deleteEmailAccountInput,
	getEmailInput,
	listEmailsInput,
	sendEmailInput,
} from "#/features/email/lib/schemas";
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
	.validator(createEmailAccountInput)
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
	.validator(deleteEmailAccountInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.emailAccount.deleteMany({ where: { id: data.id, ownerId: userId } });
	});

// ── Message fetching ──────────────────────────────────────────────────────

export const listEmails = createServerFn({ method: "GET" })
	.validator(listEmailsInput)
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
	.validator(getEmailInput)
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
	.validator(sendEmailInput)
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
