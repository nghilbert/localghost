import { faker } from "@faker-js/faker";
import { db } from "#/prisma/db";
import { auth } from "#/shared/lib/auth.server";
import { nowTimestamp } from "#/shared/lib/temporal";

/**
 * Dev-only seed: provisions a known login plus a spread of realistic chat
 * sessions so the app has something to render on a fresh database. Never run against production.
 *
 * Login: dev@example.com / password123
 */
const DEV_EMAIL = "dev@example.com";
const DEV_PASSWORD = "password123";

async function main() {
	faker.seed(42);

	const existing = await db.orm.public.User.where({ email: DEV_EMAIL }).first();
	if (existing) {
		await db.orm.public.User.where({ id: existing.id }).delete();
	}

	await auth.api.signUpEmail({
		body: { email: DEV_EMAIL, password: DEV_PASSWORD, name: faker.person.fullName() },
	});
	const user = await db.orm.public.User.where({ email: DEV_EMAIL }).first();
	if (!user) throw new Error(`Sign-up didn't create ${DEV_EMAIL}`);

	for (let i = 0; i < 5; i++) {
		const messageCount = faker.number.int({ min: 2, max: 6 });
		// One `ChatThread` row holds the whole transcript as a `@tanstack/ai`
		// UIMessage[] blob — the framework's native persistence shape.
		const messages = Array.from({ length: messageCount }, (_, index) => ({
			id: faker.string.uuid(),
			role: index % 2 === 0 ? "user" : "assistant",
			parts: [{ type: "text", content: faker.lorem.paragraph() }],
		}));
		const conversation = await db.orm.public.Conversation.select("id").create({
			ownerId: user.id,
			title: faker.lorem.sentence({ min: 2, max: 4 }),
			updatedAt: nowTimestamp(),
		});
		await db.orm.public.ChatThread.create({
			threadId: conversation.id,
			messages,
			updatedAt: nowTimestamp(),
		});
	}

	console.log(`Seeded ${DEV_EMAIL} with chats.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.close();
	});
