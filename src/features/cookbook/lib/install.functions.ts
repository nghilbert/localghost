import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { isAdmin } from "#/features/admin/lib/admin.server";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { recommendInstallVariant } from "#/features/cookbook/lib/recommendations";
import { buildOllamaUrlFromHost, RemoteHostSchema } from "#/features/cookbook/lib/remote-host";
import { getHardwareInfo } from "#/lib/hardware.server";
import { probeOllama, upsertOllamaEndpoint } from "#/lib/ollama.server";
import {
	beginOllamaInstall,
	getInstallCapabilities,
	getInstallState,
	hasNvidiaContainerRuntime,
	startOllamaContainer,
	stopOllamaContainer,
} from "#/lib/ollama-install.server";

async function getAdminUserId(): Promise<string> {
	const userId = await getCurrentUserId();
	if (!(await isAdmin(userId))) throw new Error("Forbidden");
	return userId;
}

export const getOllamaInstallInfo = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	if (!(await isAdmin(userId))) {
		return { isAdmin: false as const };
	}
	const capabilities = await getInstallCapabilities();
	const recommendedVariant = recommendInstallVariant({
		gpus: getHardwareInfo().gpus,
		nvidiaRuntime: capabilities.nvidiaRuntime,
	});
	return {
		isAdmin: true as const,
		...capabilities,
		recommendedVariant,
		installState: getInstallState(),
	};
});

export const installOllama = createServerFn({ method: "POST" })
	.validator(z.object({ variant: z.enum(["cpu", "nvidia", "amd"]) }))
	.handler(async ({ data }) => {
		await getAdminUserId();
		if (data.variant === "nvidia" && !(await hasNvidiaContainerRuntime())) {
			throw new Error("The nvidia container runtime isn't set up on the host");
		}
		return beginOllamaInstall(data.variant);
	});

export const startOllama = createServerFn({ method: "POST" }).handler(async () => {
	await getAdminUserId();
	await startOllamaContainer();
});

export const stopOllama = createServerFn({ method: "POST" }).handler(async () => {
	await getAdminUserId();
	await stopOllamaContainer();
});

export const testRemoteOllama = createServerFn({ method: "POST" })
	.validator(RemoteHostSchema)
	.handler(async ({ data }) => {
		await getCurrentUserId();
		const probe = await probeOllama(buildOllamaUrlFromHost(data.host, data.port));
		return { reachable: probe.reachable, modelCount: probe.installedModels.length };
	});

export const registerRemoteOllama = createServerFn({ method: "POST" })
	.validator(RemoteHostSchema)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const url = buildOllamaUrlFromHost(data.host, data.port);
		const probe = await probeOllama(url);
		if (!probe.reachable) {
			throw new Error(`No Ollama instance is responding at ${data.host}:${data.port}`);
		}
		await upsertOllamaEndpoint(userId, url);
	});

export const ollamaInstallQueryOptions = () =>
	queryOptions({
		queryKey: ["ollama-install"],
		queryFn: () => getOllamaInstallInfo(),
	});
