import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/shared/components/ui/toast";
import {
	deleteModel,
	libraryStatusQueryOptions,
	registerRemoteRuntime,
	testRemoteRuntime,
} from "./model.functions";

/** Deletes an installed model. */
export function useDeleteModel() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: { endpointId: string; model: string }) => deleteModel({ data: input }),
		onSuccess: async (_data, { model }) => {
			await queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey });
			toast.add({ title: `${model} deleted`, type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to delete model", type: "error", description: error.message }),
	});
}

/** Connects a remote llama.cpp runtime. */
export function useConnectRuntime() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: { url: string }) => registerRemoteRuntime({ data: input }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey }),
				queryClient.invalidateQueries({ queryKey: ["endpoints"] }),
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

/** Tests a llama.cpp runtime URL without saving it. */
export function useTestRuntime() {
	return useMutation({
		mutationFn: (url: string) => testRemoteRuntime({ data: { url } }),
	});
}
