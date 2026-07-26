import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "#/shared/components/ui/toast";
import { authClient } from "#/shared/lib/auth-client";

/** Permanently deletes the account, then signs out to the sign-in screen. */
export function useDeleteAccount() {
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async () => {
			const { error } = await authClient.deleteUser();
			if (error) throw new Error(error.message ?? "Failed to delete account");
		},
		onSuccess: () => navigate({ to: "/sign-in" }),
		onError: (error) =>
			toast.add({ title: "Failed to delete account", type: "error", description: error.message }),
	});
}
