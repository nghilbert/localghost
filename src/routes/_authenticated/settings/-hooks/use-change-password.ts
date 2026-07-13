import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
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
		onSuccess: () => toast.success("Password changed"),
		onError: (error) => toast.error("Failed to change password", { description: error.message }),
	});
}
