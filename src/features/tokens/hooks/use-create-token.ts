import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import type { createTokenInput } from "#/features/tokens/lib/schemas";
import { createToken } from "#/features/tokens/lib/token.functions";

export function useCreateToken() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.input<typeof createTokenInput>) => createToken({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-tokens"] }),
	});
}
