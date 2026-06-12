import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { isAdmin } from "#/features/admin/lib/admin.server";
import { auth } from "#/features/auth/lib/auth.server";
import { buildOllamaUrlFromHost, RemoteHostSchema } from "#/features/cookbook/lib/remote-host";
import { getHardwareInfo } from "#/lib/hardware.server";
import { probeOllama, upsertOllamaEndpoint } from "#/lib/ollama.server";
import {
	beginOllamaInstall,
	getInstallCapabilities,
	getInstallState,
	startOllamaContainer,
	stopOllamaContainer,
} from "#/lib/ollama-install.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

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
	return { isAdmin: true as const, ...capabilities, installState: getInstallState() };
});

export const installOllama = createServerFn({ method: "POST" }).handler(async () => {
	await getAdminUserId();
	// GPU vendor is detected server-side — docker argv never derives from the client.
	const gpuVendor = getHardwareInfo().gpus?.[0]?.vendor ?? null;
	return beginOllamaInstall(gpuVendor);
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
