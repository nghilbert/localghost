import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
			toast.success(`${model} deleted`);
		},
		onError: (error) => toast.error("Failed to delete model", { description: error.message }),
	});

	const connectRemoteMutation = useMutation({
		mutationFn: (input: { url: string }) => registerRemoteRuntime({ data: input }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: libraryStatusQueryOptions().queryKey });
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
			toast.success("Connected to llama.cpp");
		},
		onError: (error) =>
			toast.error("Failed to connect to llama.cpp", { description: error.message }),
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
