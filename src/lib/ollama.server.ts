import type { OllamaInstalledModel } from "#/features/cookbook/lib/types";
import { prisma } from "#/lib/db.server";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

const WELL_KNOWN_URLS = [
	DEFAULT_OLLAMA_URL,
	"http://127.0.0.1:11434",
	"http://host.docker.internal:11434",
];

/**
 * Resolves the Ollama base URL for a user: their configured ollama endpoint first,
 * then the OLLAMA_URL environment variable (set by docker-compose), then localhost.
 */
export async function getOllamaUrl(userId: string): Promise<string> {
	const endpoint = await prisma.modelEndpoint.findFirst({
		where: { ownerId: userId, provider: "ollama" },
		orderBy: { createdAt: "asc" },
	});
	// `||` (not `??`) so empty-string env vars count as unset
	return (endpoint?.url || process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL).replace(/\/+$/, "");
}

/**
 * Ordered, deduplicated list of URLs where Ollama might be running: the user's
 * saved endpoints, then the OLLAMA_URL env var, then well-known local addresses.
 */
export function buildOllamaCandidateUrls(opts: {
	savedUrls: string[];
	envUrl: string | undefined;
}): string[] {
	const candidates = [...opts.savedUrls, opts.envUrl ?? "", ...WELL_KNOWN_URLS]
		.map((url) => url.trim().replace(/\/+$/, ""))
		.filter((url) => url.length > 0);
	return [...new Set(candidates)];
}

export type OllamaProbeResult = {
	reachable: boolean;
	installedModels: OllamaInstalledModel[];
};

/** Checks whether an Ollama instance answers at the given base URL and lists its models. */
export async function probeOllama(url: string, timeoutMs = 2500): Promise<OllamaProbeResult> {
	try {
		const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
		if (!res.ok) return { reachable: false, installedModels: [] };

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

		return { reachable: true, installedModels };
	} catch {
		return { reachable: false, installedModels: [] };
	}
}

export type OllamaScanResult = {
	url: string;
	installedModels: OllamaInstalledModel[];
	/** The user's oldest saved ollama endpoint, so callers can sync it without re-querying. */
	savedEndpoint: { id: string; url: string } | null;
};

/**
 * Probes all candidate URLs for the user concurrently; the first reachable
 * instance in priority order wins.
 */
export async function scanForOllama(userId: string): Promise<OllamaScanResult | null> {
	const saved = await prisma.modelEndpoint.findMany({
		where: { ownerId: userId, provider: "ollama" },
		orderBy: { createdAt: "asc" },
		select: { id: true, url: true },
	});
	const candidates = buildOllamaCandidateUrls({
		savedUrls: saved.map((endpoint) => endpoint.url),
		envUrl: process.env.OLLAMA_URL,
	});

	const probes = await Promise.all(
		candidates.map(async (url) => ({ url, ...(await probeOllama(url)) })),
	);
	const found = probes.find((probe) => probe.reachable);
	if (!found) return null;

	return {
		url: found.url,
		installedModels: found.installedModels,
		savedEndpoint: saved[0] ?? null,
	};
}

/**
 * Keeps the user's ollama endpoint row in sync with where Ollama was actually found,
 * creating it on first detection so chat can use local models with zero setup.
 * Pass `existing` (the oldest saved ollama endpoint, or null) when already known
 * to skip the lookup.
 */
export async function upsertOllamaEndpoint(
	userId: string,
	url: string,
	existing?: { id: string; url: string } | null,
): Promise<void> {
	const normalizedUrl = url.replace(/\/+$/, "");
	const resolved =
		existing !== undefined
			? existing
			: await prisma.modelEndpoint.findFirst({
					where: { ownerId: userId, provider: "ollama" },
					orderBy: { createdAt: "asc" },
					select: { id: true, url: true },
				});

	if (!resolved) {
		await prisma.modelEndpoint.create({
			data: { name: "Ollama (local)", url: normalizedUrl, provider: "ollama", ownerId: userId },
		});
	} else if (resolved.url !== normalizedUrl) {
		await prisma.modelEndpoint.update({
			where: { id: resolved.id },
			data: { url: normalizedUrl },
		});
	}
}

/** Local addresses where a freshly started Ollama container is reachable from this process. */
export function localOllamaUrls(inContainer: boolean): string[] {
	return inContainer
		? ["http://host.docker.internal:11434", DEFAULT_OLLAMA_URL]
		: [DEFAULT_OLLAMA_URL, "http://127.0.0.1:11434"];
}
