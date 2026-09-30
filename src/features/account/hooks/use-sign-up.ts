import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { z } from "zod";
import type { signUpSchema } from "#/features/account/account.schemas";
import { authClient } from "#/lib/auth-client";

/** Creates the account and opens the app. The server's error message is shown by the form. */
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
