import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";
import {
	decryptSecret,
	encryptSecret,
	validateWebhookUrl,
	WEBHOOK_EVENTS,
} from "#/lib/webhook.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const webhooksQueryOptions = () => ({
	queryKey: ["webhooks"] as const,
	queryFn: () => getWebhooks(),
});

export const getWebhooks = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	const webhooks = await prisma.webhook.findMany({
		where: { ownerId: userId },
		orderBy: { createdAt: "desc" },
	});
	return webhooks.map((w) => ({
		id: w.id,
		name: w.name,
		url: w.url,
		events: w.events.split(",").filter(Boolean),
		hasSecret: !!w.secretEncrypted,
		isActive: w.isActive,
		lastTriggeredAt: w.lastTriggeredAt,
		lastStatusCode: w.lastStatusCode,
		lastError: w.lastError,
		createdAt: w.createdAt,
	}));
});

export const createWebhook = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			name: z.string().min(1),
			url: z.string().url(),
			events: z.array(z.enum(WEBHOOK_EVENTS as unknown as [string, ...string[]])).min(1),
			secret: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await validateWebhookUrl(data.url);
		return prisma.webhook.create({
			data: {
				name: data.name,
				url: data.url,
				events: data.events.join(","),
				secretEncrypted: data.secret ? encryptSecret(data.secret) : null,
				ownerId: userId,
			},
		});
	});

export const updateWebhook = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.uuid(),
			isActive: z.boolean().optional(),
			name: z.string().min(1).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const existing = await prisma.webhook.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!existing) throw new Error("Not found");
		return prisma.webhook.update({
			where: { id: data.id },
			data: { isActive: data.isActive, name: data.name },
		});
	});

export const deleteWebhook = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const existing = await prisma.webhook.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!existing) throw new Error("Not found");
		await prisma.webhook.delete({ where: { id: data.id } });
	});

export const testWebhook = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const webhook = await prisma.webhook.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!webhook) throw new Error("Not found");

		await validateWebhookUrl(webhook.url);

		const secret = webhook.secretEncrypted ? decryptSecret(webhook.secretEncrypted) : undefined;
		const body = JSON.stringify({
			event: "webhook.test",
			timestamp: new Date().toISOString(),
			data: { message: "Test ping" },
		});

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"X-Webhook-Event": "webhook.test",
			"User-Agent": "PrettyOdysseus-Webhook/1.0",
		};

		if (secret) {
			const { createHmac } = await import("node:crypto");
			const sig = createHmac("sha256", secret).update(body).digest("hex");
			headers["X-Webhook-Signature"] = sig;
		}

		const res = await fetch(webhook.url, {
			method: "POST",
			headers,
			body,
			signal: AbortSignal.timeout(10_000),
			redirect: "error",
		});

		await prisma.webhook.update({
			where: { id: webhook.id },
			data: { lastTriggeredAt: new Date(), lastStatusCode: res.status, lastError: null },
		});

		return { status: res.status, ok: res.ok };
	});
