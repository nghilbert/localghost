import { beforeEach, describe, expect, it } from "vitest";
import type { Endpoint } from "#/generated/prisma/client";
import { prisma } from "#/lib/db.server";
import { createEndpoint, createUser, resetDb } from "#/test/db.server";
import { toClientEndpoint, upsertLlamacppEndpoint } from "./endpoint.server";

beforeEach(resetDb);

function makeEndpoint(overrides: Partial<Endpoint> = {}): Endpoint {
	return {
		id: "e1",
		name: "My endpoint",
		url: "https://api.openai.com",
		apiKeyEncrypted: null,
		provider: "openai",
		options: null,
		ownerId: "owner-1",
		updatedAt: new Date(),
		discovered: null,
		...overrides,
	};
}

describe("toClientEndpoint", () => {
	it("strips the encrypted key and reports hasApiKey true when one is stored", () => {
		const result = toClientEndpoint(makeEndpoint({ apiKeyEncrypted: "cipher-text" }));

		expect(result.apiKeyEncrypted).toBeUndefined();
		expect(result.hasApiKey).toBe(true);
	});

	it("reports hasApiKey false when no key is stored", () => {
		const result = toClientEndpoint(makeEndpoint({ apiKeyEncrypted: null }));

		expect(result.hasApiKey).toBe(false);
	});
});

describe("upsertLlamacppEndpoint", () => {
	it("upserts on the discovered-row unique on first detection", async () => {
		const user = await createUser();

		await upsertLlamacppEndpoint({ ownerId: user.id, url: "http://localhost:8080/" });

		const created = await prisma.endpoint.findFirst({ where: { ownerId: user.id } });
		expect(created).toMatchObject({
			name: "llama.cpp (local)",
			url: "http://localhost:8080",
			provider: "llamacpp",
			discovered: true,
		});
	});

	it("updates the existing endpoint when llama.cpp moved", async () => {
		const user = await createUser();
		const existing = await createEndpoint({
			ownerId: user.id,
			url: "http://old-host:8080",
			provider: "llamacpp",
			discovered: true,
		});

		await upsertLlamacppEndpoint({ ownerId: user.id, url: "http://localhost:8080" });

		const updated = await prisma.endpoint.findUniqueOrThrow({ where: { id: existing.id } });
		expect(updated.url).toBe("http://localhost:8080");
		expect(await prisma.endpoint.count({ where: { ownerId: user.id } })).toBe(1);
	});

	it("does nothing when the saved url already matches", async () => {
		const user = await createUser();
		const existing = await createEndpoint({
			ownerId: user.id,
			url: "http://localhost:8080",
			provider: "llamacpp",
		});

		await upsertLlamacppEndpoint({ ownerId: user.id, url: "http://localhost:8080/" });

		const unchanged = await prisma.endpoint.findUniqueOrThrow({ where: { id: existing.id } });
		expect(unchanged.updatedAt).toEqual(existing.updatedAt);
		expect(await prisma.endpoint.count({ where: { ownerId: user.id } })).toBe(1);
	});
});
