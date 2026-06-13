import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { createMcpServer } from "#/features/mcp/lib/mcp.functions";
import type { createMcpServerInput } from "#/features/mcp/lib/schemas";

export function useCreateMcpServer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.input<typeof createMcpServerInput>) => createMcpServer({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcp-servers"] }),
	});
}
