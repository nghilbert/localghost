import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import type { OllamaStatus } from "#/features/cookbook/lib/types";
import { getHardwareInfo } from "#/lib/hardware.server";
import { getOllamaUrl, scanForOllama, upsertOllamaEndpoint } from "#/lib/ollama.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const getHardware = createServerFn({ method: "GET" }).handler(async () => {
	await getCurrentUserId();
	return getHardwareInfo();
});

export const scanOllamaStatus = createServerFn({ method: "GET" }).handler(
	async (): Promise<OllamaStatus> => {
		const userId = await getCurrentUserId();
		const found = await scanForOllama(userId);
		if (!found) return { found: false, ollamaUrl: null, installedModels: [] };

		await upsertOllamaEndpoint(userId, found.url);
		return { found: true, ollamaUrl: found.url, installedModels: found.installedModels };
	},
);

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

export const cookbookStatusQueryOptions = () =>
	queryOptions({
		queryKey: ["cookbook-status"],
		queryFn: () => scanOllamaStatus(),
	});

export const hardwareQueryOptions = () =>
	queryOptions({
		queryKey: ["cookbook-hardware"],
		queryFn: () => getHardware(),
		staleTime: 60_000,
	});
