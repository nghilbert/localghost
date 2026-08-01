import { useMutation } from "@tanstack/react-query";
import { toast } from "#/shared/components/ui/toast";
import { authClient } from "#/shared/lib/auth-client";

type ChangePassword = {
	currentPassword: string;
	newPassword: string;
};

/** Changes the account password and revokes all other active sessions. */
export function useChangePassword() {
	return useMutation({
		mutationFn: async ({ currentPassword, newPassword }: ChangePassword) => {
			const { error } = await authClient.changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: true,
			});
			if (error) throw new Error(error.message ?? "Failed to change password");
		},
		onSuccess: () => toast.add({ title: "Password changed", type: "success" }),
		onError: (error) =>
			toast.add({ title: "Failed to change password", type: "error", description: error.message }),
	});
}
