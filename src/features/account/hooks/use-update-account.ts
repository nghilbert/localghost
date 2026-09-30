import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "#/components/ui/toast";
import { updateUserSettings } from "#/features/account/account.functions";
import { accountQueries } from "#/features/account/account.queries";
import { authClient } from "#/lib/auth-client";

type UpdateAccount = {
	name: string;
	/** Empty clears it. */
	systemPrompt: string;
	/** Sent unchanged, since the settings save replaces both fields. */
	temperature: number;
};

/** Saves the account form: the profile name and the chat system prompt. */
export function useUpdateAccount() {
	const queryClient = useQueryClient();
	const router = useRouter();
	return useMutation({
		mutationFn: async ({ name, systemPrompt, temperature }: UpdateAccount) => {
			const { error } = await authClient.updateUser({ name });
			if (error) throw new Error(error.message ?? "Failed to update profile");
			await updateUserSettings({
				data: { systemPrompt: systemPrompt.trim() || null, temperature },
			});
		},
		onSuccess: async () => {
			// The session name lives in router context, not the query cache.
			await Promise.all([
				router.invalidate(),
				queryClient.invalidateQueries({ queryKey: accountQueries.all() }),
			]);
			toast.add({ title: "Account saved", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to save account", type: "error", description: error.message }),
	});
}
