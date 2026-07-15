import { beforeEach, describe, expect, it, vi } from "vitest";
import { recallMemories } from "#/shared/domain/memory/memory.server";

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("#/shared/lib/db.server", () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock("#/shared/domain/memory/embeddings.server", () => ({
	embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
	toVectorLiteral: (v: number[]) => `[${v.join(",")}]`,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

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
});
