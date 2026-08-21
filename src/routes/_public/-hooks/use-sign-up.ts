import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { z } from "zod/v4";
import type { signUpSchema } from "#/shared/domain/auth/schemas";
import { authClient } from "#/shared/lib/auth-client";

/**
 * Creates the account and sends the new user to the app. The rejection carries the
 * server's message, which is how the closed-sign-up refusal reaches the form.
 */
export function useSignUp() {
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async (credentials: z.infer<typeof signUpSchema>) => {
			const { error } = await authClient.signUp.email(credentials);
			if (error) throw new Error(error.message ?? "Sign up failed. Please try again.");
		},
		onSuccess: () => navigate({ to: "/" }),
	});
}
