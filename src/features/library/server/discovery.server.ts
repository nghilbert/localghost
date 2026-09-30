import { trimPathRight } from "@tanstack/react-router";
import {
	findLlamacppEndpoint,
	findLlamacppEndpoints,
	type SavedLlamacppEndpoint,
} from "#/features/endpoint/server/endpoint.server";
import { parseParamB } from "#/features/library/lib/model-id";
import { aggregatePullProgress } from "#/features/library/lib/pull-progress";
import type { InstalledModel, PullProgress } from "#/features/library/library.types";
import type { Endpoint } from "#/generated/prisma/client";
import { endpointApiKey } from "#/lib/crypto.server";
import { type LlamaModel, LOCAL_LLAMACPP_API_KEY, listModels } from "#/lib/llamacpp/client.server";

const DEFAULT_RUNTIME_URL = "http://localhost:8080";

const WELL_KNOWN_URLS = [
	DEFAULT_RUNTIME_URL,
	"http://127.0.0.1:8080",
	// The llama.cpp service in compose.yaml.
	"http://llamacpp:8080",
	"http://host.docker.internal:8080",
];

/** The endpoint's API key, or the bundled server's when it has none. */
function runtimeApiKey(endpoint: Pick<Endpoint, "apiKeyEncrypted"> | null): string {
	return (endpoint ? endpointApiKey(endpoint) : undefined) || LOCAL_LLAMACPP_API_KEY;
}

/** The `:QUANT` suffix of a router model id, e.g. `Q4_K_M` from `repo:Q4_K_M`. */
function parseQuant(id: string): string | null {
	const idx = id.lastIndexOf(":");
	return idx === -1 ? null : id.slice(idx + 1);
}

/**
 * The URL and API key of a llama.cpp endpoint the user owns.
 * @throws If there is no such endpoint.
 */
export async function getRuntimeEndpointById({
	userId,
	endpointId,
}: {
	userId: string;
	endpointId: string;
}): Promise<{ url: string; apiKey: string }> {
	const endpoint = await findLlamacppEndpoint({ id: endpointId, ownerId: userId });
	if (!endpoint) throw new Error("llama.cpp endpoint not found");
	return { url: trimPathRight(endpoint.url), apiKey: runtimeApiKey(endpoint) };
}

/** URLs where llama.cpp might be running: the user's saved endpoints, then common local addresses. */
export function buildRuntimeCandidateUrls(opts: { savedUrls: string[] }): string[] {
	const candidates = [...opts.savedUrls, ...WELL_KNOWN_URLS]
		.map((url) => trimPathRight(url.trim()))
		.filter((url) => url.length > 0);
	return [...new Set(candidates)];
}

/** Whether a llama.cpp server answered, with its models and downloads. */
type RuntimeProbeResult = {
	reachable: boolean;
	installedModels: InstalledModel[];
	downloads: Record<string, PullProgress>;
};

/** Splits the router's model list into installed models and running downloads. */
export function toRuntimeModels(models: LlamaModel[]): {
	installedModels: InstalledModel[];
	downloads: Record<string, PullProgress>;
} {
	const installedModels: InstalledModel[] = [];
	const downloads: Record<string, PullProgress> = {};

	for (const model of models) {
		// A finished ("downloaded") model counts as installed, not as a download.
		if (model.status.value === "downloading") {
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

/** Checks whether llama.cpp answers at `url`, and lists its models. */
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

/** Where llama.cpp was found, with its models, downloads, and matching saved endpoint. */
type RuntimeScanResult = {
	url: string;
	installedModels: InstalledModel[];
	downloads: Record<string, PullProgress>;
	/** The API key that reached this URL. */
	apiKey: string;
	/** The saved endpoint for this URL, else the user's oldest llama.cpp endpoint. */
	savedEndpoint: SavedLlamacppEndpoint | null;
};

/** Probes the candidate URLs at once and returns the first reachable one, in priority order. */
export async function scanForRuntime(userId: string): Promise<RuntimeScanResult | null> {
	const saved = await findLlamacppEndpoints({ ownerId: userId });
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
