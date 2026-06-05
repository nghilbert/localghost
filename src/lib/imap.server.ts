import { ImapFlow } from "imapflow";
import { decrypt } from "#/lib/crypto.server";

export type ImapMessage = {
	uid: string;
	subject: string;
	from: string;
	date: Date;
	seen: boolean;
	size: number;
	snippet: string;
};

export type ImapMessageFull = ImapMessage & {
	text: string;
	html: string | null;
};

type AccountConfig = {
	host: string;
	port: number;
	user: string;
	passwordEncrypted: string;
	starttls: boolean;
};

function makeClient(account: AccountConfig): ImapFlow {
	const password = decrypt(account.passwordEncrypted);
	return new ImapFlow({
		host: account.host,
		port: account.port,
		secure: !account.starttls,
		auth: { user: account.user, pass: password },
		logger: false,
	});
}

export async function listMessages(
	account: AccountConfig,
	folder = "INBOX",
	limit = 50,
): Promise<ImapMessage[]> {
	const client = makeClient(account);
	await client.connect();

	try {
		const lock = await client.getMailboxLock(folder);
		try {
			const messages: ImapMessage[] = [];
			// Fetch the most recent `limit` messages in reverse order
			const mailbox = client.mailbox;
			const total = (mailbox && "exists" in mailbox ? mailbox.exists : 0) ?? 0;
			if (total === 0) return [];

			const start = Math.max(1, total - limit + 1);
			for await (const msg of client.fetch(`${start}:${total}`, {
				uid: true,
				flags: true,
				envelope: true,
				size: true,
				bodyStructure: true,
			})) {
				if (!msg.envelope || !msg.flags) continue;
				messages.unshift({
					uid: String(msg.uid),
					subject: msg.envelope.subject ?? "(no subject)",
					from: msg.envelope.from?.[0]?.address ?? "",
					date: msg.envelope.date ?? new Date(),
					seen: msg.flags.has("\\Seen"),
					size: msg.size ?? 0,
					snippet: "",
				});
			}
			return messages;
		} finally {
			lock.release();
		}
	} finally {
		await client.logout();
	}
}

export async function fetchMessage(
	account: AccountConfig,
	uid: string,
	folder = "INBOX",
): Promise<ImapMessageFull | null> {
	const client = makeClient(account);
	await client.connect();

	try {
		const lock = await client.getMailboxLock(folder);
		try {
			const msg = await client.fetchOne(
				uid,
				{
					uid: true,
					flags: true,
					envelope: true,
					source: true,
				},
				{ uid: true },
			);

			if (!msg || !msg.envelope) return null;

			// Mark as seen
			await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });

			// Parse plain text from raw source (simple extraction)
			const raw = msg.source?.toString("utf-8") ?? "";
			const text = extractPlainText(raw);

			return {
				uid,
				subject: msg.envelope.subject ?? "(no subject)",
				from: msg.envelope.from?.[0]?.address ?? "",
				date: msg.envelope.date ?? new Date(),
				seen: true,
				size: raw.length,
				snippet: text.slice(0, 200),
				text,
				html: extractHtml(raw),
			};
		} finally {
			lock.release();
		}
	} finally {
		await client.logout();
	}
}

/** Quick-n-dirty plain-text extraction from a raw MIME message. */
function extractPlainText(raw: string): string {
	// Try to find text/plain part
	const textPlainMatch = raw.match(
		/Content-Type: text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\s*$)/i,
	);
	if (textPlainMatch?.[1]) return textPlainMatch[1].trim();
	// Fall back to stripping all headers
	const bodyStart = raw.indexOf("\r\n\r\n");
	if (bodyStart !== -1) return raw.slice(bodyStart + 4, bodyStart + 4 + 4000).trim();
	return raw.slice(0, 2000);
}

function extractHtml(raw: string): string | null {
	const match = raw.match(/Content-Type: text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--)/i);
	return match?.[1]?.trim() ?? null;
}
