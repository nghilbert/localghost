import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateUserSettings } from "#/entities/user-settings/user-settings.functions";
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
	return useMutation({
		mutationFn: async ({ name, systemPrompt, temperature }: UpdateAccount) => {
			const { error } = await authClient.updateUser({ name });
			if (error) throw new Error(error.message ?? "Failed to update profile");
			await updateUserSettings({
				data: { systemPrompt: systemPrompt.trim() || null, temperature },
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session"] });
			queryClient.invalidateQueries({ queryKey: ["user-settings"] });
			toast.success("Account saved");
		},
		onError: (error) => toast.error("Failed to save account", { description: error.message }),
	});
}
