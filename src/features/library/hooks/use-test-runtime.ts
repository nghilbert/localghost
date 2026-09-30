import { useMutation } from "@tanstack/react-query";
import { testRemoteRuntime } from "#/features/library/library.functions";

/** Tests a llama.cpp runtime URL without saving it. */
export function useTestRuntime() {
	return useMutation({
		mutationFn: (url: string) => testRemoteRuntime({ data: { url } }),
	});
}
