import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { z } from "zod/v4";
import type { signInSchema } from "#/shared/domain/auth/schemas";
import { authClient } from "#/shared/lib/auth-client";

/**
 * Signs the user in and sends them to the app. The rejection carries the message the
 * form renders inline, so a bad password lands next to the fields instead of in a toast.
 */
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
