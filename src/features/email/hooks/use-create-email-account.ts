import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { createEmailAccount } from "#/features/email/lib/email.functions";
import type { createEmailAccountInput } from "#/features/email/lib/schemas";

export function useCreateEmailAccount() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.input<typeof createEmailAccountInput>) => createEmailAccount({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-accounts"] }),
	});
}
