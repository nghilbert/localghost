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
