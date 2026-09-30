import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { z } from "zod";
import type { signInSchema } from "#/features/account/account.schemas";
import { authClient } from "#/lib/auth-client";

/** Signs in and opens the app. The error message is shown inline by the form, not as a toast. */
export function useSignIn() {
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async (credentials: z.infer<typeof signInSchema>) => {
			const { error } = await authClient.signIn.email(credentials);
			if (!error) return;
			// A refusal because someone else is signed in carries a message worth showing.
			// Other failures stay vague, so the form does not reveal which emails exist.
			throw new Error(
				error.status === 403 && error.message ? error.message : "Invalid credentials.",
			);
		},
		onSuccess: () => navigate({ to: "/" }),
	});
}
