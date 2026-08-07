import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "#/shared/components/ui/toast";
import { updateUserSettings } from "#/shared/domain/user-settings/user-settings.functions";
import { authClient } from "#/shared/lib/auth-client";

type UpdateAccount = {
	name: string;
	/** The user's global chat system prompt; empty clears it. */
	systemPrompt: string;
	/** Carried through so saving the account doesn't reset the stored temperature. */
	temperature: number;
};

/** Saves the account form: profile name (better-auth) plus the chat system prompt. */
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
			// The session lives in router context (root `beforeLoad`), not react-query.
			await Promise.all([
				router.invalidate(),
				queryClient.invalidateQueries({ queryKey: ["user-settings"] }),
			]);
			toast.add({ title: "Account saved", type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to save account", type: "error", description: error.message }),
	});
}
