import { trimPathRight } from "@tanstack/react-router";
import { endpointApiKey } from "#/shared/domain/endpoint/endpoint.server";
import { parseParamB } from "#/shared/domain/model/model-id";
import { prisma } from "#/shared/lib/db.server";
import { type LlamaModel, listModels } from "#/shared/lib/llamacpp/client.server";
import type { InstalledModel, PullProgress } from "./types";

const DEFAULT_RUNTIME_URL = "http://localhost:8080";

const WELL_KNOWN_URLS = [
	DEFAULT_RUNTIME_URL,
	"http://127.0.0.1:8080",
	// The compose-managed llama.cpp service (compose.yaml), resolvable by container name.
	"http://llamacpp:8080",
	"http://host.docker.internal:8080",
];

/** Parses the `:QUANT` suffix off a router model id (`repo:Q4_K_M` → `Q4_K_M`). */
function parseQuant(id: string): string | null {
	const idx = id.lastIndexOf(":");
	return idx === -1 ? null : id.slice(idx + 1);
}

/**
 * Resolves the llama.cpp base URL and (if the saved endpoint carries one) API
 * key for a user: their configured llamacpp endpoint first, then localhost.
 */
export async function getRuntimeEndpoint(userId: string): Promise<{
	url: string;
	apiKey: string | undefined;
}> {
	const endpoint = await prisma.endpoint.findFirst({
		where: { ownerId: userId, provider: "llamacpp" },
		orderBy: { id: "asc" },
	});
	return {
		url: trimPathRight(endpoint?.url ?? DEFAULT_RUNTIME_URL),
		apiKey: endpoint ? endpointApiKey(endpoint) : undefined,
	};
}

/** Resolves a user-owned llama.cpp endpoint for a runtime action. */
export async function getRuntimeEndpointById({
	userId,
	endpointId,
}: {
	userId: string;
	endpointId: string;
}): Promise<{ url: string; apiKey: string | undefined }> {
	const endpoint = await prisma.endpoint.findFirst({
		where: { id: endpointId, ownerId: userId, provider: "llamacpp" },
	});
	if (!endpoint) throw new Error("llama.cpp endpoint not found");
	return { url: trimPathRight(endpoint.url), apiKey: endpointApiKey(endpoint) };
}

/**
 * Ordered, deduplicated list of URLs where llama-server might be running: the
 * user's saved endpoints, then well-known local addresses.
 */
export function buildRuntimeCandidateUrls(opts: { savedUrls: string[] }): string[] {
	const candidates = [...opts.savedUrls, ...WELL_KNOWN_URLS]
		.map((url) => trimPathRight(url.trim()))
		.filter((url) => url.length > 0);
	return [...new Set(candidates)];
}

export type RuntimeProbeResult = {
	reachable: boolean;
	installedModels: InstalledModel[];
	downloads: Record<string, PullProgress>;
};

/** Converts llama.cpp router state into installed models and active download progress. */
export function toRuntimeModels(models: LlamaModel[]): {
	installedModels: InstalledModel[];
	downloads: Record<string, PullProgress>;
} {
	const installedModels: InstalledModel[] = [];
	const downloads: Record<string, PullProgress> = {};

	for (const model of models) {
		if (model.status.value === "downloading") {
			const files = Object.values(model.status.progress ?? {});
			const completed = files.reduce((sum, file) => sum + file.done, 0);
			const total = files.reduce((sum, file) => sum + file.total, 0);
			downloads[model.id] = {
				status: "Downloading",
				...(files.length > 0 && { completed, total }),
			};
			continue;
		}

		installedModels.push({
			id: model.id,
			sizeBytes: null,
			quant: parseQuant(model.id),
			paramB: parseParamB(model.id),
			status: model.status.value,
			vision: model.architecture?.input_modalities?.includes("image") ?? false,
		});
	}

	return { installedModels, downloads };
}

/** Checks whether a llama-server router answers at the given base URL and lists its models. */
export async function probeRuntime({
	url,
	apiKey,
	timeoutMs = 2500,
}: {
	url: string;
	apiKey?: string;
	timeoutMs?: number;
}): Promise<RuntimeProbeResult> {
	try {
		const models = await listModels({ url, apiKey, timeoutMs });
		return { reachable: true, ...toRuntimeModels(models) };
	} catch {
		return { reachable: false, installedModels: [], downloads: {} };
	}
}

/** The user's oldest saved llamacpp endpoint row, as far as discovery needs it. */
export type SavedRuntimeEndpoint = { id: string; url: string };

export type RuntimeScanResult = {
	url: string;
	installedModels: InstalledModel[];
	downloads: Record<string, PullProgress>;
	/** The API key that reached this URL, if any, so callers can reuse it without re-querying. */
	apiKey: string | undefined;
	/** The user's oldest saved llamacpp endpoint, so callers can sync it without re-querying. */
	savedEndpoint: SavedRuntimeEndpoint | null;
};

/**
 * Probes candidate URLs concurrently and returns the first reachable one in
 * priority order. Saved endpoints use their API keys; fallback URLs do not.
 */
export async function scanForRuntime(userId: string): Promise<RuntimeScanResult | null> {
	const saved = await prisma.endpoint.findMany({
		where: { ownerId: userId, provider: "llamacpp" },
		orderBy: { id: "asc" },
	});
	const keyByUrl = new Map(
		saved.map((endpoint) => [trimPathRight(endpoint.url), endpointApiKey(endpoint)]),
	);
	const candidates = buildRuntimeCandidateUrls({
		savedUrls: saved.map((endpoint) => endpoint.url),
	});

	const probes = await Promise.all(
		candidates.map(async (url) => ({
			url,
			...(await probeRuntime({ url, apiKey: keyByUrl.get(url) })),
		})),
	);
	const found = probes.find((probe) => probe.reachable);
	if (!found) return null;
	const matchedEndpoint = saved.find((endpoint) => trimPathRight(endpoint.url) === found.url);
	const savedEndpoint = matchedEndpoint ?? saved[0];

	return {
		url: found.url,
		installedModels: found.installedModels,
		downloads: found.downloads,
		apiKey: keyByUrl.get(found.url),
		savedEndpoint: savedEndpoint ? { id: savedEndpoint.id, url: savedEndpoint.url } : null,
	};
}

/**
 * Keeps the user's llamacpp endpoint row in sync with where the runtime was
 * found, creating it on first detection. Pass `existing` when known to skip
 * the lookup.
 */
export async function upsertRuntimeEndpoint({
	userId,
	url,
	existing,
}: {
	userId: string;
	url: string;
	existing?: SavedRuntimeEndpoint | null;
}): Promise<string> {
	const normalizedUrl = trimPathRight(url);
	const resolved =
		existing !== undefined
			? existing
			: await prisma.endpoint.findFirst({
					where: { ownerId: userId, provider: "llamacpp" },
					orderBy: { id: "asc" },
					select: { id: true, url: true },
				});

	if (!resolved) {
		// Upsert on the (ownerId, discovered) unique: concurrent first-time scans
		// both land here, and the loser must update instead of inserting a duplicate.
		const endpoint = await prisma.endpoint.upsert({
			where: { ownerId_discovered: { ownerId: userId, discovered: true } },
			create: {
				name: "llama.cpp (local)",
				url: normalizedUrl,
				provider: "llamacpp",
				ownerId: userId,
				discovered: true,
			},
			update: { url: normalizedUrl },
			select: { id: true },
		});
		return endpoint.id;
	}

	if (resolved.url === normalizedUrl) return resolved.id;
	await prisma.endpoint.update({ where: { id: resolved.id }, data: { url: normalizedUrl } });
	return resolved.id;
}
