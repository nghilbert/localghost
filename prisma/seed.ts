import { faker } from "@faker-js/faker";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";

/**
 * Dev-only seed: provisions a known login plus a spread of realistic notes, skills, and chat
 * sessions so the app has something to render on a fresh database. Never run against production.
 *
 * Login: dev@example.com / password123
 */
const DEV_EMAIL = "dev@example.com";
const DEV_PASSWORD = "password123";

const NOTE_TYPES = ["note", "task"] as const;
const NOTE_COLORS = ["amber", "rose", "sky", "violet", "emerald"] as const;

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

	await prisma.note.createMany({
		data: Array.from({ length: 12 }, () => ({
			ownerId: user.id,
			title: faker.lorem.sentence({ min: 2, max: 5 }),
			content: faker.lorem.paragraphs({ min: 1, max: 3 }),
			noteType: faker.helpers.arrayElement(NOTE_TYPES),
			color: faker.helpers.arrayElement(NOTE_COLORS),
			pinned: faker.datatype.boolean({ probability: 0.25 }),
		})),
	});

	await prisma.skill.createMany({
		data: Array.from({ length: 4 }, () => ({
			ownerId: user.id,
			name: faker.person.jobTitle(),
			description: faker.lorem.sentence(),
			content: faker.lorem.paragraphs(2),
		})),
	});

	for (let i = 0; i < 5; i++) {
		const messageCount = faker.number.int({ min: 2, max: 6 });
		await prisma.chatSession.create({
			data: {
				ownerId: user.id,
				name: faker.lorem.sentence({ min: 2, max: 4 }),
				messageCount,
				lastMessageAt: faker.date.recent({ days: 14 }),
				messages: {
					create: Array.from({ length: messageCount }, (_, index) => ({
						role: index % 2 === 0 ? "user" : "assistant",
						content: faker.lorem.paragraph(),
					})),
				},
			},
		});
	}

	console.log(`Seeded ${DEV_EMAIL} with notes, skills, and chats.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
