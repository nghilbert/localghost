import { prisma } from "#/lib/db.server";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

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
