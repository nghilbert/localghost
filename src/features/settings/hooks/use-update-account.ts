import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "#/features/auth/lib/auth-client";

export function useUpdateAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (name: string) => {
			const { error } = await authClient.updateUser({ name });
			if (error) throw new Error(error.message ?? "Failed to update profile");
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session"] }),
	});
}
