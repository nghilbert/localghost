import { trimPathRight } from "@tanstack/react-router";
import { ollamaOptionsSchema } from "#/features/endpoints/lib/schemas";
import { ollamaClient } from "#/features/library/lib/ollama/client.server";
import type { OllamaInstalledModel } from "#/features/library/lib/types";
import { prisma } from "#/lib/db.server";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

const WELL_KNOWN_URLS = [
	DEFAULT_OLLAMA_URL,
	"http://127.0.0.1:11434",
	// The compose-managed Ollama service (compose.yaml), resolvable by container name.
	"http://ollama:11434",
	"http://host.docker.internal:11434",
];

/**
 * Resolves the Ollama base URL for a user: their configured ollama endpoint first,
 * then localhost.
 */
export async function getOllamaUrl(userId: string): Promise<string> {
	const endpoint = await prisma.modelEndpoint.findFirst({
		where: { ownerId: userId, provider: "ollama" },
		orderBy: { id: "asc" },
	});
	return trimPathRight(endpoint?.url ?? DEFAULT_OLLAMA_URL);
}

/**
 * Ordered, deduplicated list of URLs where Ollama might be running: the user's
 * saved endpoints, then well-known local addresses.
 */
export function buildOllamaCandidateUrls(opts: { savedUrls: string[] }): string[] {
	const candidates = [...opts.savedUrls, ...WELL_KNOWN_URLS]
		.map((url) => trimPathRight(url.trim()))
		.filter((url) => url.length > 0);
	return [...new Set(candidates)];
}

export type OllamaProbeResult = {
	reachable: boolean;
	installedModels: OllamaInstalledModel[];
};

/** Checks whether an Ollama instance answers at the given base URL and lists its models. */
export async function probeOllama({
	url,
	timeoutMs = 2500,
}: {
	url: string;
	timeoutMs?: number;
}): Promise<OllamaProbeResult> {
	try {
		const { models } = await ollamaClient({ host: url, timeoutMs }).list();
		const installedModels = models.map((m) => ({
			name: m.name,
			sizeBytes: m.size,
			family: m.details.family,
			parameterSize: m.details.parameter_size,
			quantizationLevel: m.details.quantization_level,
		}));
		return { reachable: true, installedModels };
	} catch {
		return { reachable: false, installedModels: [] };
	}
}

/** The user's oldest saved ollama endpoint row, as far as discovery needs it. */
export type SavedOllamaEndpoint = { id: string; url: string; options: unknown };

export type OllamaScanResult = {
	url: string;
	installedModels: OllamaInstalledModel[];
	/** The user's oldest saved ollama endpoint, so callers can sync it without re-querying. */
	savedEndpoint: SavedOllamaEndpoint | null;
};

/**
 * Probes all candidate URLs for the user concurrently; the first reachable
 * instance in priority order wins.
 */
export async function scanForOllama(userId: string): Promise<OllamaScanResult | null> {
	const saved = await prisma.modelEndpoint.findMany({
		where: { ownerId: userId, provider: "ollama" },
		orderBy: { id: "asc" },
		select: { id: true, url: true, options: true },
	});
	const candidates = buildOllamaCandidateUrls({ savedUrls: saved.map((endpoint) => endpoint.url) });

	const probes = await Promise.all(
		candidates.map(async (url) => ({ url, ...(await probeOllama({ url })) })),
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
 * Keeps the user's ollama endpoint row in sync with where Ollama was found,
 * creating it on first detection. Pass `existing` when known to skip the lookup.
 * @param numCtx - A number saves the override, `null` clears it, `undefined` leaves it.
 */
export async function upsertOllamaEndpoint({
	userId,
	url,
	existing,
	numCtx,
}: {
	userId: string;
	url: string;
	existing?: SavedOllamaEndpoint | null;
	numCtx?: number | null;
}): Promise<void> {
	const normalizedUrl = trimPathRight(url);
	const resolved =
		existing !== undefined
			? existing
			: await prisma.modelEndpoint.findFirst({
					where: { ownerId: userId, provider: "ollama" },
					orderBy: { id: "asc" },
					select: { id: true, url: true, options: true },
				});

	if (!resolved) {
		await prisma.modelEndpoint.create({
			data: {
				name: "Ollama (local)",
				url: normalizedUrl,
				provider: "ollama",
				ownerId: userId,
				...(typeof numCtx === "number" ? { options: { num_ctx: numCtx } } : {}),
			},
		});
		return;
	}

	const nextOptions =
		numCtx === undefined ? undefined : mergeNumCtx({ options: resolved.options, numCtx });
	if (resolved.url === normalizedUrl && nextOptions === undefined) return;
	await prisma.modelEndpoint.update({
		where: { id: resolved.id },
		data: {
			url: normalizedUrl,
			...(nextOptions !== undefined ? { options: nextOptions } : {}),
		},
	});
}

/** Sets or clears num_ctx on an endpoint's options blob, keeping the other keys. */
function mergeNumCtx({ options, numCtx }: { options: unknown; numCtx: number | null }) {
	const parsed = ollamaOptionsSchema.safeParse(options);
	const merged = { ...(parsed.success ? parsed.data : {}) };
	if (numCtx === null) delete merged.num_ctx;
	else merged.num_ctx = numCtx;
	return merged;
}
