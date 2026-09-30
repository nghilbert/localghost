import { faker } from "@faker-js/faker";
import type { Prisma } from "#/generated/prisma/client";
import { prisma } from "#/lib/db.server";

/** Empties every table, reading their names from `pg_tables` so new models are included. */
export async function resetDb(): Promise<void> {
	const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
		SELECT tablename FROM pg_tables
		WHERE schemaname = 'public' AND tablename != '_prisma_migrations'`;
	if (tables.length === 0) return;
	const names = tables.map((t) => `"${t.tablename}"`).join(", ");
	await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

/** Creates a user with fake defaults. */
export function createUser(overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
	return prisma.user.create({
		data: { name: faker.person.fullName(), email: faker.internet.email(), ...overrides },
	});
}

/** Creates an endpoint for `ownerId` with fake defaults. */
export function createEndpoint(
	overrides: Partial<Prisma.EndpointUncheckedCreateInput> & { ownerId: string },
) {
	return prisma.endpoint.create({
		data: {
			name: faker.commerce.productName(),
			url: faker.internet.url(),
			provider: "openai",
			...overrides,
		},
	});
}

/** Creates a conversation for `ownerId` with fake defaults. */
export function createConversation(
	overrides: Partial<Prisma.ConversationUncheckedCreateInput> & { ownerId: string },
) {
	return prisma.conversation.create({ data: { title: "Test chat", ...overrides } });
}

/** Creates a session for `userId` that is live for a day unless `expiresAt` says otherwise. */
export function createSession(
	overrides: Partial<Prisma.SessionUncheckedCreateInput> & { userId: string },
) {
	return prisma.session.create({
		data: {
			token: faker.string.alphanumeric(32),
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			...overrides,
		},
	});
}
