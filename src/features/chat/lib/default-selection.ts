/**
 * Orders a user's endpoints for picking a new chat's default: the built-in Ollama
 * endpoint first, then everything else in its original (creation) order. Pure and
 * server-free so the priority can be unit-tested without a database.
 */
export function orderEndpointsForDefault<T extends { provider: string }>(endpoints: T[]): T[] {
	return [...endpoints].sort((a, b) => {
		if (a.provider === b.provider) return 0;
		return a.provider === "ollama" ? -1 : b.provider === "ollama" ? 1 : 0;
	});
}
