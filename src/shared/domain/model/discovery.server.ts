import { trimPathRight } from "@tanstack/react-router";
import { db } from "#/prisma/db";
import { type EndpointRow, endpointApiKey } from "#/shared/domain/endpoint/endpoint.server";
import { parseParamB } from "#/shared/domain/model/param-count";
import { aggregatePullProgress } from "#/shared/domain/model/pull-progress";
import {
	type LlamaModel,
	LOCAL_LLAMACPP_API_KEY,
	listModels,
} from "#/shared/lib/llamacpp/client.server";
import { nowTimestamp } from "#/shared/lib/temporal";
import type { InstalledModel, PullProgress } from "./types";

const DEFAULT_RUNTIME_URL = "http://localhost:8080";

const WELL_KNOWN_URLS = [
	DEFAULT_RUNTIME_URL,
	"http://127.0.0.1:8080",
	// The compose-managed llama.cpp service (compose.yaml), resolvable by container name.
	"http://llamacpp:8080",
	"http://host.docker.internal:8080",
];

/**
 * The key to send a llama.cpp runtime: the endpoint's own, else the bundled service's.
 * Auto-discovered endpoints store no key, and {@link LOCAL_LLAMACPP_API_KEY} documents
 * which routes reject an unauthenticated request.
 */
function runtimeApiKey(endpoint: Pick<EndpointRow, "apiKeyEncrypted"> | null): string {
	return (endpoint ? endpointApiKey(endpoint) : undefined) || LOCAL_LLAMACPP_API_KEY;
}

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
	apiKey: string;
}> {
	const endpoint = await db.orm.public.Endpoint.where({ ownerId: userId, provider: "llamacpp" })
		.orderBy((e) => e.id.asc())
		.first();
	return {
		url: trimPathRight(endpoint?.url ?? DEFAULT_RUNTIME_URL),
		apiKey: runtimeApiKey(endpoint),
	};
}

/** Resolves a user-owned llama.cpp endpoint for a runtime action. */
export async function getRuntimeEndpointById({
	userId,
	endpointId,
}: {
	userId: string;
	endpointId: string;
}): Promise<{ url: string; apiKey: string }> {
	const endpoint = await db.orm.public.Endpoint.where({
		id: endpointId,
		ownerId: userId,
		provider: "llamacpp",
	}).first();
	if (!endpoint) throw new Error("llama.cpp endpoint not found");
	return { url: trimPathRight(endpoint.url), apiKey: runtimeApiKey(endpoint) };
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
		// A just-finished download still reports "downloaded" until the router reloads.
		// Both states leave here, which also narrows `status.value` for `InstalledModel`.
		if (model.status.value === "downloading" || model.status.value === "downloaded") {
			downloads[model.id] = aggregatePullProgress(model.status.progress ?? {});
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
	/** The API key that reached this URL, so callers can reuse it without re-querying. */
	apiKey: string;
	/** The user's oldest saved llamacpp endpoint, so callers can sync it without re-querying. */
	savedEndpoint: SavedRuntimeEndpoint | null;
};

/**
 * Probes candidate URLs concurrently and returns the first reachable one in
 * priority order. Saved endpoints use their API keys; fallback URLs do not.
 */
export async function scanForRuntime(userId: string): Promise<RuntimeScanResult | null> {
	const saved = await db.orm.public.Endpoint.where({ ownerId: userId, provider: "llamacpp" })
		.orderBy((e) => e.id.asc())
		.all();
	const keyByUrl = new Map(
		saved.map((endpoint) => [trimPathRight(endpoint.url), runtimeApiKey(endpoint)]),
	);
	const candidates = buildRuntimeCandidateUrls({
		savedUrls: saved.map((endpoint) => endpoint.url),
	});

	const probes = await Promise.all(
		candidates.map(async (url) => ({
			url,
			...(await probeRuntime({ url, apiKey: keyByUrl.get(url) ?? LOCAL_LLAMACPP_API_KEY })),
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
		apiKey: keyByUrl.get(found.url) ?? LOCAL_LLAMACPP_API_KEY,
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
			: await db.orm.public.Endpoint.select("id", "url")
					.where({ ownerId: userId, provider: "llamacpp" })
					.orderBy((e) => e.id.asc())
					.first();

	if (!resolved) {
		// Real `ON CONFLICT` on the (ownerId, discovered) unique: concurrent first-time
		// scans both land here, and the loser updates (also correcting `provider` on a
		// row still tagged "ollama" from before this migration) instead of racing to
		// insert a duplicate. `.upsert()` only targets the primary key, not a secondary
		// unique constraint, so this needs raw SQL rather than the ORM's upsert.
		const now = nowTimestamp();
		const plan = db.raw.sql`
			INSERT INTO endpoint (name, url, provider, owner_id, discovered, updated_at)
			VALUES ('llama.cpp (local)', ${normalizedUrl}, 'llamacpp', ${userId}::uuid, true, ${now.toString()}::timestamp)
			ON CONFLICT (owner_id, discovered)
			DO UPDATE SET url = EXCLUDED.url, provider = EXCLUDED.provider, updated_at = EXCLUDED.updated_at
			RETURNING id`
			.returnsRow({ id: "pg/uuid@1" })
			.build();
		const [row] = await db.runtime().query(plan);
		if (!row) throw new Error("INSERT ... ON CONFLICT ... RETURNING id returned no row");
		return row.id;
	}

	if (resolved.url === normalizedUrl) return resolved.id;
	await db.orm.public.Endpoint.where({ id: resolved.id }).update({
		url: normalizedUrl,
		provider: "llamacpp",
		updatedAt: nowTimestamp(),
	});
	return resolved.id;
}
