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
			if (error) throw new Error("Invalid credentials.");
		},
		onSuccess: () => navigate({ to: "/" }),
	});
}
