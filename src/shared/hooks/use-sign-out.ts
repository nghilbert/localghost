import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "#/shared/components/ui/toast";
import { authClient } from "#/shared/lib/auth-client";

/** Signs the user out and returns them to the sign-in page. */
export function useSignOut() {
	const navigate = useNavigate();

	return useMutation({
		mutationFn: () => authClient.signOut(),
		onSuccess: () => navigate({ to: "/sign-in" }),
		onError: () => toast.add({ title: "Failed to sign out", type: "error" }),
	});
}
