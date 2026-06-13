import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { createEndpoint } from "#/features/chat/lib/chat.functions";
import type { createEndpointSchema } from "#/features/chat/lib/schemas";

export function useCreateEndpoint() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.input<typeof createEndpointSchema>) => createEndpoint({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["endpoints"] }),
	});
}
