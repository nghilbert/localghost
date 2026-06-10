import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";
import { getHardwareInfo } from "#/lib/hardware.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

async function getOllamaUrl(userId: string): Promise<string> {
	const ep = await prisma.modelEndpoint.findFirst({
		where: { ownerId: userId, provider: "ollama" },
		orderBy: { createdAt: "asc" },
	});
	return (ep?.url ?? "http://localhost:11434").replace(/\/+$/, "");
}

export const getHardware = createServerFn({ method: "GET" }).handler(async () => {
	await getCurrentUserId();
	return getHardwareInfo();
});

export const getOllamaStatus = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	const ollamaUrl = await getOllamaUrl(userId);

	try {
		const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return { ollamaUrl, reachable: false, installedModels: [] };

		const data = (await res.json()) as {
			models?: {
				name: string;
				size: number;
				details?: {
					family?: string;
					parameter_size?: string;
					quantization_level?: string;
				};
			}[];
		};

		const installedModels = (data.models ?? []).map((m) => ({
			name: m.name,
			sizeBytes: m.size,
			family: m.details?.family ?? "",
			parameterSize: m.details?.parameter_size ?? "",
			quantizationLevel: m.details?.quantization_level ?? "",
		}));

		return { ollamaUrl, reachable: true, installedModels };
	} catch {
		return { ollamaUrl, reachable: false, installedModels: [] };
	}
});

export const deleteModel = createServerFn({ method: "POST" })
	.validator(z.object({ model: z.string().min(1) }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const ollamaUrl = await getOllamaUrl(userId);
		const res = await fetch(`${ollamaUrl}/api/delete`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: data.model }),
		});
		if (!res.ok) throw new Error(`Failed to delete model: ${res.statusText}`);
	});

export const ensureOllamaEndpoint = createServerFn({ method: "POST" })
	.validator(z.object({ url: z.string().url() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const normalizedUrl = data.url.replace(/\/+$/, "");
		const existing = await prisma.modelEndpoint.findFirst({
			where: { ownerId: userId, provider: "ollama", url: normalizedUrl },
		});
		if (existing) return { id: existing.id, created: false };
		const ep = await prisma.modelEndpoint.create({
			data: {
				name: "Ollama (local)",
				url: normalizedUrl,
				provider: "ollama",
				ownerId: userId,
			},
		});
		return { id: ep.id, created: true };
	});
