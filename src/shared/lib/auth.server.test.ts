import { beforeEach, describe, expect, it, vi } from "vitest";

const { count } = vi.hoisted(() => ({ count: vi.fn() }));

vi.mock("#/shared/lib/db.server", () => ({ prisma: { user: { count } } }));
vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));

const { isSignUpOpen } = await import("./auth.server");

beforeEach(() => {
	vi.clearAllMocks();
});

describe("isSignUpOpen", () => {
	it("is open when no account can sign in yet", async () => {
		count.mockResolvedValue(0);

		expect(await isSignUpOpen()).toBe(true);
	});

	it("is closed once an account holds a password", async () => {
		count.mockResolvedValue(1);

		expect(await isSignUpOpen()).toBe(false);
	});

	it("ignores a user left without a credential, so a failed sign-up cannot lock the app", async () => {
		count.mockResolvedValue(0);

		await isSignUpOpen();

		expect(count).toHaveBeenCalledWith({
			where: { accounts: { some: { password: { not: null } } } },
		});
	});
});
