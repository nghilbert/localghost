import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { endpointQueries } from "#/features/endpoint/endpoint.queries";
import { registerRemoteRuntime } from "#/features/library/library.functions";
import { libraryQueries } from "#/features/library/library.queries";

/** Connects a llama.cpp runtime by URL and saves it as an endpoint. */
export function useConnectRuntime() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: { url: string }) => registerRemoteRuntime({ data: input }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: libraryQueries.runtimeStatus().queryKey }),
				queryClient.invalidateQueries({ queryKey: endpointQueries.all() }),
			]);
			toast.add({ title: "Connected to llama.cpp", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to connect to llama.cpp",
				type: "error",
				description: error.message,
			}),
	});
}
