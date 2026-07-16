import { beforeEach, describe, expect, it, vi } from "vitest";
import { recallMemories } from "#/shared/domain/memory/memory.server";

const { queryRaw, embed } = vi.hoisted(() => ({ queryRaw: vi.fn(), embed: vi.fn() }));

vi.mock("#/shared/lib/db.server", () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock("#/shared/domain/memory/embeddings.server", () => ({
	embed,
	toVectorLiteral: (v: number[]) => `[${v.join(",")}]`,
}));

beforeEach(() => {
	vi.clearAllMocks();
	embed.mockResolvedValue([0.1, 0.2, 0.3]);
});

/** The interpolated params (minus the SQL template) of the sole keyword-fallback query. */
function keywordCallParams(): unknown[] {
	const call = queryRaw.mock.calls.at(0);
	if (!call) throw new Error("expected keywordRecall to issue a query");
	return call.slice(1);
}

describe("recallMemories", () => {
	it("degrades to the keyword fallback when the vector query throws (e.g. a dimension mismatch)", async () => {
		queryRaw
			.mockRejectedValueOnce(new Error("different vector dimensions 1536 and 3"))
			.mockResolvedValueOnce([{ id: "m1", text: "keyword hit", category: "fact" }]);

		const result = await recallMemories({ ownerId: "owner-1", query: "hit" });

		expect(queryRaw).toHaveBeenCalledTimes(2);
		expect(result).toEqual([{ id: "m1", text: "keyword hit", category: "fact" }]);
	});

	it("returns the vector result directly when the query succeeds", async () => {
		queryRaw.mockResolvedValueOnce([{ id: "m1", text: "semantic hit", category: "fact" }]);

		const result = await recallMemories({ ownerId: "owner-1", query: "hit" });

		expect(queryRaw).toHaveBeenCalledTimes(1);
		expect(result).toEqual([{ id: "m1", text: "semantic hit", category: "fact" }]);
	});

	it("tokenizes a multi-word keyword query into one LIKE pattern per word", async () => {
		embed.mockResolvedValueOnce(null); // no embedding endpoint -> keyword fallback
		queryRaw.mockResolvedValueOnce([]);

		await recallMemories({ ownerId: "owner-1", query: "Favorite Color" });

		expect(queryRaw).toHaveBeenCalledTimes(1);
		const params = keywordCallParams();
		expect(params).toContainEqual(["%favorite%", "%color%"]);
	});

	it("escapes LIKE metacharacters and drops sub-two-char words", async () => {
		embed.mockResolvedValueOnce(null);
		queryRaw.mockResolvedValueOnce([]);

		await recallMemories({ ownerId: "owner-1", query: "a 50%_off" });

		const params = keywordCallParams();
		expect(params).toContainEqual([String.raw`%50\%\_off%`]);
	});
});
