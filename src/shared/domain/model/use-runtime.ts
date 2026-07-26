import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/shared/components/ui/toast";
import {
	deleteModel,
	libraryStatusQueryOptions,
	registerRemoteRuntime,
	testRemoteRuntime,
} from "./model.functions";

export function useRuntime() {
	const queryClient = useQueryClient();

	const deleteModelMutation = useMutation({
		mutationFn: (input: { endpointId: string; model: string }) => deleteModel({ data: input }),
		onSuccess: (_data, { model }) => {
			queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey });
			toast.add({ title: `${model} deleted`, type: "success" });
		},
		onError: (error) =>
			toast.add({ title: "Failed to delete model", type: "error", description: error.message }),
	});

	const connectRemoteMutation = useMutation({
		mutationFn: (input: { url: string }) => registerRemoteRuntime({ data: input }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey });
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
			toast.add({ title: "Connected to llama.cpp", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to connect to llama.cpp",
				type: "error",
				description: error.message,
			}),
	});

	const testRemoteMutation = useMutation({
		mutationFn: (url: string) => testRemoteRuntime({ data: { url } }),
	});

	return {
		deleteModel: deleteModelMutation,
		connectRemote: connectRemoteMutation,
		testRemote: testRemoteMutation,
	};
}
