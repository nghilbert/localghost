import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "#/components/ui/toast";
import { authClient } from "#/lib/auth-client";

/** Signs the user out and returns them to the sign-in page. */
export function useSignOut() {
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async () => {
			const { error } = await authClient.signOut();
			if (error) throw new Error(error.message ?? "Failed to sign out");
		},
		onSuccess: () => navigate({ to: "/sign-in" }),
		onError: (error) =>
			toast.add({ title: "Failed to sign out", type: "error", description: error.message }),
	});
}
