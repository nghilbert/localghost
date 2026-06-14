import nodemailer from "nodemailer";
import { decrypt } from "#/lib/crypto.server";

type SmtpConfig = {
	host: string;
	port: number;
	security: string;
	user: string;
	passwordEncrypted: string;
	fromAddress: string;
};

export type SendMailOptions = {
	to: string;
	subject: string;
	text: string;
	html?: string;
	replyTo?: string;
};

/**
 * Sends an email through a user's SMTP account, decrypting the stored password and
 * selecting SSL or STARTTLS from the account's security setting.
 *
 * @param config - The SMTP account: host, port, security, credentials, and from address.
 * @param opts - The message to send: recipient, subject, body, and optional reply-to.
 */
export async function sendMail(config: SmtpConfig, opts: SendMailOptions): Promise<void> {
	const password = decrypt(config.passwordEncrypted);

	const transporter = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.security === "ssl",
		requireTLS: config.security === "starttls",
		auth: { user: config.user, pass: password },
	});

	await transporter.sendMail({
		from: config.fromAddress || config.user,
		to: opts.to,
		subject: opts.subject,
		text: opts.text,
		html: opts.html,
		replyTo: opts.replyTo,
	});
}
