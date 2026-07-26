import { trimPathRight } from "@tanstack/react-router";
import { endpointApiKey } from "#/shared/domain/endpoint/endpoint.server";
import { prisma } from "#/shared/lib/db.server";
import { listModels, serverProps } from "#/shared/lib/llamacpp/client.server";
import { parseParamB } from "./catalog-curation";
import type { InstalledModel } from "./types";

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
};

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
		const installedModels: InstalledModel[] = models.map((m) => ({
			id: m.id,
			sizeBytes: null,
			quant: parseQuant(m.id),
			paramB: parseParamB(m.id),
			status: m.status.value,
			vision: m.architecture?.input_modalities?.includes("image") ?? false,
		}));
		return { reachable: true, installedModels };
	} catch {
		return { reachable: false, installedModels: [] };
	}
}

/** The user's oldest saved llamacpp endpoint row, as far as discovery needs it. */
export type SavedRuntimeEndpoint = { id: string; url: string };

export type RuntimeScanResult = {
	url: string;
	installedModels: InstalledModel[];
	/** The API key that reached this URL, if any, so callers can reuse it without re-querying. */
	apiKey: string | undefined;
	/** The user's oldest saved llamacpp endpoint, so callers can sync it without re-querying. */
	savedEndpoint: SavedRuntimeEndpoint | null;
};

/**
 * Probes all candidate URLs for the user concurrently; the first reachable
 * instance in priority order wins. A candidate matching a saved endpoint's
 * URL is probed with that endpoint's decrypted API key; well-known addresses
 * with no saved endpoint are probed keyless.
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

	return {
		url: found.url,
		installedModels: found.installedModels,
		apiKey: keyByUrl.get(found.url),
		savedEndpoint: saved[0] ? { id: saved[0].id, url: saved[0].url } : null,
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

const CONTEXT_WINDOW_TTL_MS = 60_000;
const contextWindowCache = new Map<string, { nCtx: number; expiresAt: number }>();

/**
 * The model's real `n_ctx`, read live from llama-server's `GET /props` and
 * cached briefly per endpoint+model (it's constant while the model stays
 * loaded, but chat streams shouldn't pay a round trip on every message).
 * @returns `undefined` on any failure, so callers fall back to message-count bounding.
 */
export async function getContextWindow({
	url,
	model,
	apiKey,
}: {
	url: string;
	model: string;
	apiKey?: string;
}): Promise<number | undefined> {
	const key = `${url}:${model}`;
	const cached = contextWindowCache.get(key);
	if (cached && cached.expiresAt > Date.now()) return cached.nCtx;
	try {
		const props = await serverProps({ url, model, apiKey, timeoutMs: 2000 });
		contextWindowCache.set(key, {
			nCtx: props.n_ctx,
			expiresAt: Date.now() + CONTEXT_WINDOW_TTL_MS,
		});
		return props.n_ctx;
	} catch {
		return undefined;
	}
}
