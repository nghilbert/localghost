import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "#/prisma/db";
import { recallMemories, saveMemory } from "#/shared/domain/memory/memory.server";
import { nowTimestamp } from "#/shared/lib/temporal";

const { embed } = vi.hoisted(() => ({ embed: vi.fn() }));
vi.mock("#/shared/domain/memory/embeddings.server", async (importOriginal) => ({
	...(await importOriginal<typeof import("#/shared/domain/memory/embeddings.server")>()),
	embed,
}));

let ownerId: string;

beforeEach(async () => {
	vi.clearAllMocks();
	embed.mockResolvedValue(null);
	const user = await db.orm.public.User.create({
		name: "Test",
		email: `test-${crypto.randomUUID()}@example.com`,
		updatedAt: nowTimestamp(),
	});
	ownerId = user.id;
});

afterEach(async () => {
	await db.orm.public.User.where({ id: ownerId }).delete();
});

describe("recallMemories", () => {
	it("tokenizes a multi-word keyword query into one LIKE pattern per word", async () => {
		await saveMemory({ ownerId, text: "favorite color is blue", source: "user" });

		const result = await recallMemories({ ownerId, query: "Favorite Color" });

		expect(result.map((m) => m.text)).toEqual(["favorite color is blue"]);
	});

	it("escapes LIKE metacharacters and drops sub-two-char words", async () => {
		await saveMemory({ ownerId, text: "a coupon code is 50%_off", source: "user" });

		const result = await recallMemories({ ownerId, query: "a 50%_off" });

		expect(result.map((m) => m.text)).toEqual(["a coupon code is 50%_off"]);
	});

	it("returns nothing for a blank query", async () => {
		expect(await recallMemories({ ownerId, query: "   " })).toEqual([]);
	});
});

describe("saveMemory dedup", () => {
	it("skips the insert when an exact (text, category) row already exists", async () => {
		await saveMemory({ ownerId, text: "user's name is Nate", category: "fact" });

		const result = await saveMemory({ ownerId, text: "user's name is Nate", category: "fact" });

		expect(result).toEqual({ status: "duplicate", text: "user's name is Nate" });
		const { total } = await db.orm.public.Memory.where({ ownerId }).aggregate((a) => ({
			total: a.count(),
		}));
		expect(total).toBe(1);
	});

	it("inserts when the text differs", async () => {
		await saveMemory({ ownerId, text: "lives in Berlin" });
		const result = await saveMemory({ ownerId, text: "likes TypeScript" });

		expect(result).toEqual({ status: "saved" });
		const { total } = await db.orm.public.Memory.where({ ownerId }).aggregate((a) => ({
			total: a.count(),
		}));
		expect(total).toBe(2);
	});
});
