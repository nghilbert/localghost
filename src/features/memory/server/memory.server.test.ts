import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "#/lib/db.server";
import { createUser, resetDb } from "#/test/db.server";

const { embed } = vi.hoisted(() => ({ embed: vi.fn() }));
vi.mock("./embeddings.server", async (importOriginal) => ({
	...(await importOriginal<typeof import("./embeddings.server")>()),
	embed,
}));

import { insertMemory, recallMemories, saveMemory } from "./memory.server";

beforeEach(async () => {
	await resetDb();
	vi.clearAllMocks();
	embed.mockResolvedValue([0.1, 0.2, 0.3]);
});

/** Inserts a memory row directly, bypassing `saveMemory`'s embedding call and dedup check. */
function seedMemory({
	ownerId,
	text,
	category,
	embedding = null,
}: {
	ownerId: string;
	text: string;
	category?: string;
	embedding?: number[] | null;
}) {
	return insertMemory({ db: prisma, ownerId, text, category, source: "test", embedding });
}

describe("recallMemories", () => {
	it("degrades to the keyword fallback when the vector query throws (e.g. a dimension mismatch)", async () => {
		const user = await createUser();
		await seedMemory({ ownerId: user.id, text: "keyword hit", embedding: [0.1, 0.2, 0.3] });
		// A 5-dim query embedding against a 3-dim stored one makes pgvector's `<=>` throw.
		embed.mockResolvedValueOnce([0.1, 0.2, 0.3, 0.4, 0.5]);

		const result = await recallMemories({ ownerId: user.id, query: "hit" });

		expect(result).toEqual([{ id: expect.any(String), text: "keyword hit", category: "fact" }]);
	});

	it("returns the vector result directly when the query succeeds", async () => {
		const user = await createUser();
		await seedMemory({ ownerId: user.id, text: "semantic hit", embedding: [0.1, 0.2, 0.3] });
		embed.mockResolvedValueOnce([0.1, 0.2, 0.3]);

		const result = await recallMemories({ ownerId: user.id, query: "hit" });

		expect(result).toEqual([{ id: expect.any(String), text: "semantic hit", category: "fact" }]);
	});

	it("tokenizes a multi-word keyword query into one pattern per word", async () => {
		const user = await createUser();
		// Contains "color" but not the literal substring "favorite color"; only matches
		// if the query was split into per-word patterns rather than kept whole.
		await seedMemory({ ownerId: user.id, text: "I love the color blue" });
		await seedMemory({ ownerId: user.id, text: "nothing relevant here" });
		embed.mockResolvedValueOnce(null); // no embedding endpoint -> keyword fallback

		const result = await recallMemories({ ownerId: user.id, query: "Favorite Color" });

		expect(result.map((m) => m.text)).toEqual(["I love the color blue"]);
	});

	it("escapes LIKE metacharacters and drops sub-two-char words", async () => {
		const user = await createUser();
		await seedMemory({ ownerId: user.id, text: "Get 50%_off today" });
		// Would incorrectly match an unescaped "%50%_off%" pattern (% and _ as wildcards)
		// but must not match once they're escaped to literal characters.
		await seedMemory({ ownerId: user.id, text: "50 blah Xoff" });
		embed.mockResolvedValueOnce(null);

		const result = await recallMemories({ ownerId: user.id, query: "a 50%_off" });

		expect(result.map((m) => m.text)).toEqual(["Get 50%_off today"]);
	});
});

describe("saveMemory dedup", () => {
	it("skips the insert when an exact (text, category) row already exists", async () => {
		const user = await createUser();
		await seedMemory({ ownerId: user.id, text: "user's name is Nate" });

		const result = await saveMemory({ ownerId: user.id, text: "user's name is Nate" });

		expect(result).toEqual({ status: "duplicate", text: "user's name is Nate" });
		expect(await prisma.memory.count({ where: { ownerId: user.id } })).toBe(1);
	});

	it("skips the insert when a stored memory is within the semantic distance threshold", async () => {
		const user = await createUser();
		await seedMemory({ ownerId: user.id, text: "prefers TypeScript", embedding: [1, 0, 0] });
		embed.mockResolvedValueOnce([1, 0, 0]); // identical direction -> cosine distance 0

		const result = await saveMemory({ ownerId: user.id, text: "likes to use TypeScript" });

		expect(result).toEqual({ status: "duplicate", text: "prefers TypeScript" });
		expect(await prisma.memory.count({ where: { ownerId: user.id } })).toBe(1);
	});

	it("inserts when the nearest memory is beyond the threshold", async () => {
		const user = await createUser();
		await seedMemory({ ownerId: user.id, text: "prefers TypeScript", embedding: [1, 0, 0] });
		embed.mockResolvedValueOnce([-1, 0, 0]); // opposite direction -> max cosine distance

		const result = await saveMemory({ ownerId: user.id, text: "lives in Berlin" });

		expect(result).toEqual({ status: "saved" });
		expect(await prisma.memory.count({ where: { ownerId: user.id } })).toBe(2);
	});

	it("still inserts when stored memories have another dimension", async () => {
		const user = await createUser();
		await seedMemory({ ownerId: user.id, text: "prefers TypeScript", embedding: [1, 0, 0] });
		embed.mockResolvedValueOnce([1, 0, 0, 0, 0]); // dimension mismatch against the stored 3-dim vector

		const result = await saveMemory({ ownerId: user.id, text: "lives in Berlin" });

		expect(result).toEqual({ status: "saved" });
		expect(await prisma.memory.count({ where: { ownerId: user.id } })).toBe(2);
	});
});
