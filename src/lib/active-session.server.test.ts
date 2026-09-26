import { beforeEach, describe, expect, it } from "vitest";
import { createSession, createUser, resetDb } from "#/test/db.server";
import { findOtherSignedInUser } from "./active-session.server";

beforeEach(resetDb);

describe("findOtherSignedInUser", () => {
	it("returns the other person holding a live session", async () => {
		const sam = await createUser({ name: "Sam", email: "sam@example.com" });
		await createSession({ userId: sam.id });

		expect(await findOtherSignedInUser({ email: "alex@example.com" })).toEqual({ name: "Sam" });
	});

	it("lets the signed-in person sign in again, whatever the email's case", async () => {
		const sam = await createUser({ name: "Sam", email: "sam@example.com" });
		await createSession({ userId: sam.id });

		expect(await findOtherSignedInUser({ email: "Sam@Example.com" })).toBeNull();
	});

	it("ignores an expired session", async () => {
		const sam = await createUser({ name: "Sam", email: "sam@example.com" });
		await createSession({ userId: sam.id, expiresAt: new Date(Date.now() - 1000) });

		expect(await findOtherSignedInUser({ email: "alex@example.com" })).toBeNull();
	});

	it("finds nobody when no one has signed in", async () => {
		await createUser({ name: "Sam", email: "sam@example.com" });

		expect(await findOtherSignedInUser({ email: "alex@example.com" })).toBeNull();
	});
});
