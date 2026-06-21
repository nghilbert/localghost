import { useQuery } from "@tanstack/react-query";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";
import { modelWarmupQueryOptions } from "#/features/library/lib/library.functions";

type Args = {
	endpointId: string | null | undefined;
	model: string;
	provider: string | undefined;
};

/**
 * Pre-loads the conversation's local Ollama model the moment it's selected, so
 * the cold start happens before the user sends. Only fires for Ollama endpoints
 * (cloud models are always warm). Returns the in-flight state and elapsed seconds
 * for the "Warming up the model" indicator.
 */
export function useModelWarmup({ endpointId, model, provider }: Args) {
	const enabled = Boolean(endpointId && model && provider === "ollama");
	const { isFetching } = useQuery({
		...modelWarmupQueryOptions(endpointId ?? "", model),
		enabled,
	});
	const isWarming = enabled && isFetching;
	const seconds = useElapsedSeconds(isWarming);
	return { isWarming, seconds };
}
