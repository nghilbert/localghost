import { faker } from "@faker-js/faker";
import { auth } from "#/lib/auth.server";
import { prisma } from "#/lib/db.server";

/**
 * Development seed: a known login and a few chats, so a fresh database has something to show.
 *
 * Login: dev@example.com / password123
 */
const DEV_EMAIL = "dev@example.com";
const DEV_PASSWORD = "password123";

async function main() {
	faker.seed(42);

	const existing = await prisma.user.findFirst({ where: { email: DEV_EMAIL } });
	if (existing) {
		await prisma.user.delete({ where: { id: existing.id } });
	}

	await auth.api.signUpEmail({
		body: { email: DEV_EMAIL, password: DEV_PASSWORD, name: faker.person.fullName() },
	});
	const user = await prisma.user.findFirstOrThrow({ where: { email: DEV_EMAIL } });

	for (let i = 0; i < 5; i++) {
		const messageCount = faker.number.int({ min: 2, max: 6 });
		const messages = Array.from({ length: messageCount }, (_, index) => ({
			role: index % 2 === 0 ? "user" : "assistant",
			content: faker.lorem.paragraph(),
		}));
		const conversation = await prisma.conversation.create({
			data: { ownerId: user.id, title: faker.lorem.sentence({ min: 2, max: 4 }) },
			select: { id: true },
		});
		await prisma.chatThread.create({ data: { threadId: conversation.id, messages } });
	}

	console.log(`Seeded ${DEV_EMAIL} with chats.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
