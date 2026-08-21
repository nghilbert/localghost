import { describe, expect, it } from "vitest";
import { signUpFormSchema, signUpSchema } from "#/shared/domain/auth/schemas";

const credentials = {
	name: "Odysseus",
	email: "odysseus@example.com",
	password: "long enough",
};

describe("signUpFormSchema", () => {
	it("accepts a matching confirmation", () => {
		const result = signUpFormSchema.safeParse({ ...credentials, confirmPassword: "long enough" });
		expect(result.success).toBe(true);
	});

	it("reports a mismatched confirmation on the field the user must fix", () => {
		const result = signUpFormSchema.safeParse({ ...credentials, confirmPassword: "long enouth" });

		expect(result.success).toBe(false);
		expect(result.error?.issues).toContainEqual(
			expect.objectContaining({ path: ["confirmPassword"], message: "Passwords do not match" }),
		);
	});

	it("rejects a password under the minimum before comparing the two", () => {
		const result = signUpFormSchema.safeParse({
			...credentials,
			password: "short",
			confirmPassword: "short",
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ["password"] }));
	});
});

describe("signUpSchema", () => {
	it("drops the confirmation, so it never reaches better-auth", () => {
		expect(signUpSchema.parse({ ...credentials, confirmPassword: "long enough" })).toEqual(
			credentials,
		);
	});
});
