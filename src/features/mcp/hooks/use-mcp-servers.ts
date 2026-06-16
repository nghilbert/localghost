import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod/v4";
import {
	createMcpServer,
	deleteMcpServer,
	mcpServersQueryOptions,
	testMcpServer,
	updateMcpServer,
} from "#/features/mcp/lib/mcp.functions";
import type { createMcpServerInput, updateMcpServerInput } from "#/features/mcp/lib/schemas";

/**
 * Owns the MCP servers list query plus create/update/delete/test mutations with
 * cache invalidation. Create errors surface inline via the form's `FieldError`;
 * the toggle is silent on success to avoid noise, and `testServer` returns its
 * result for the caller to render rather than toasting.
 */
export function useMcpServers() {
	const queryClient = useQueryClient();
	const { data: servers = [] } = useQuery(mcpServersQueryOptions());
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });

	const createMutation = useMutation({
		mutationFn: (data: z.input<typeof createMcpServerInput>) => createMcpServer({ data }),
		onSuccess: () => {
			invalidate();
			toast.success("MCP server added");
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: z.infer<typeof updateMcpServerInput>) => updateMcpServer({ data }),
		onSuccess: () => invalidate(),
		onError: () => toast.error("Failed to update server"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteMcpServer({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("MCP server removed");
		},
		onError: () => toast.error("Failed to remove server"),
	});

	const testMutation = useMutation({
		mutationFn: (id: string) => testMcpServer({ data: { id } }),
	});

	return {
		servers,
		createServer: createMutation,
		updateServer: updateMutation,
		deleteServer: deleteMutation,
		testServer: testMutation,
	};
}
