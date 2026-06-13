import { createHmac } from "node:crypto";
import { resolve4, resolve6 } from "node:dns/promises";
import { WEBHOOK_EVENT_VALUES, type WebhookEvent } from "#/features/webhooks/lib/schemas";
import { decrypt, encrypt } from "#/lib/crypto.server";
import { prisma } from "#/lib/db.server";

export const WEBHOOK_EVENTS = WEBHOOK_EVENT_VALUES;
export type { WebhookEvent };

const PRIVATE_PATTERNS = [
	/^127\./,
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
	/^169\.254\./,
	/^::1$/,
	/^fc00:/i,
	/^fe80:/i,
];

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "metadata.google.internal", "metadata"]);

const BLOCKED_SUFFIXES = [".local", ".internal", ".lan", ".intranet", ".localhost"];

async function isPrivateUrl(rawUrl: string): Promise<boolean> {
	try {
		const parsed = new URL(rawUrl);
		const host = parsed.hostname.toLowerCase();

		if (BLOCKED_HOSTNAMES.has(host)) return true;
		if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return true;

		// IP literal check
		if (PRIVATE_PATTERNS.some((r) => r.test(host))) return true;

		// DNS resolution check
		try {
			const addrs = await resolve4(host).catch(() => [] as string[]);
			const addrs6 = await resolve6(host).catch(() => [] as string[]);
			const all = [...addrs, ...addrs6];
			if (all.length === 0) return true;
			return all.some((a) => PRIVATE_PATTERNS.some((r) => r.test(a)));
		} catch {
			return true;
		}
	} catch {
		return true;
	}
}

export async function validateWebhookUrl(url: string): Promise<void> {
	const trimmed = url.trim();
	if (trimmed.length > 2048) throw new Error("URL too long (max 2048 characters)");
	const parsed = new URL(trimmed);
	if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("URL must use http or https");
	if (!parsed.hostname) throw new Error("URL must have a hostname");
	if (await isPrivateUrl(trimmed))
		throw new Error("URL must not point to private/internal addresses");
}

export function encryptSecret(secret: string): string {
	return encrypt(secret);
}

export function decryptSecret(enc: string): string {
	return decrypt(enc);
}

export async function fireWebhook(
	event: WebhookEvent,
	payload: Record<string, unknown>,
	ownerId: string,
): Promise<void> {
	const webhooks = await prisma.webhook.findMany({
		where: { ownerId, isActive: true },
	});

	const matching = webhooks.filter((w) =>
		w.events
			.split(",")
			.map((e) => e.trim())
			.includes(event),
	);
	if (!matching.length) return;

	await Promise.allSettled(matching.map((w) => deliverWebhook(w, event, payload)));
}

async function deliverWebhook(
	webhook: { id: string; url: string; secretEncrypted: string | null },
	event: string,
	payload: Record<string, unknown>,
): Promise<void> {
	try {
		await validateWebhookUrl(webhook.url);
	} catch {
		return;
	}

	const body = JSON.stringify({
		event,
		timestamp: new Date().toISOString(),
		data: payload,
	});

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		"X-Webhook-Event": event,
		"User-Agent": "PrettyOdysseus-Webhook/1.0",
	};

	if (webhook.secretEncrypted) {
		try {
			const secret = decryptSecret(webhook.secretEncrypted);
			const sig = createHmac("sha256", secret).update(body).digest("hex");
			headers["X-Webhook-Signature"] = sig;
		} catch {
			// Skip HMAC if decryption fails
		}
	}

	let statusCode: number | null = null;
	let lastError: string | null = null;

	try {
		const res = await fetch(webhook.url, {
			method: "POST",
			headers,
			body,
			signal: AbortSignal.timeout(10_000),
			redirect: "error",
		});
		statusCode = res.status;
	} catch (err) {
		lastError = String(err)
			.slice(0, 200)
			.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, "[ip]");
	}

	await prisma.webhook
		.update({
			where: { id: webhook.id },
			data: {
				lastTriggeredAt: new Date(),
				lastStatusCode: statusCode,
				lastError,
			},
		})
		.catch(() => {});
}
