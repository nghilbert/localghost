import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	deleteModel,
	registerRemoteOllama,
	testRemoteOllama,
} from "#/features/cookbook/lib/cookbook.functions";

export function useOllama() {
	const queryClient = useQueryClient();

	const deleteModelMutation = useMutation({
		mutationFn: (model: string) => deleteModel({ data: { model } }),
		onSuccess: (_data, model) => {
			queryClient.invalidateQueries({ queryKey: ["cookbook-status"] });
			toast.success(`${model} deleted`);
		},
		onError: (error) => toast.error("Failed to delete model", { description: error.message }),
	});

	const connectRemoteMutation = useMutation({
		mutationFn: (url: string) => registerRemoteOllama({ data: { url } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cookbook-status"] });
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
			toast.success("Connected to Ollama");
		},
		onError: (error) => toast.error("Could not connect", { description: error.message }),
	});

	const testRemoteMutation = useMutation({
		mutationFn: (url: string) => testRemoteOllama({ data: { url } }),
	});

	return {
		deleteModel: deleteModelMutation,
		connectRemote: connectRemoteMutation,
		testRemote: testRemoteMutation,
	};
}
