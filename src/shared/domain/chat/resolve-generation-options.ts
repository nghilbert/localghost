/**
 * Merges the three generation-settings scopes, most specific wins: user-global
 * temperature, then per-endpoint options, then per-model options. Temperature
 * resolves to a single top-level value since providers take it outside `options`.
 */
export function resolveGenerationOptions({
	userTemperature,
	endpointOptions,
	modelOptions,
}: {
	userTemperature: number | null | undefined;
	endpointOptions: Record<string, unknown> | undefined;
	modelOptions: Record<string, unknown> | null | undefined;
}): { temperature: number | undefined; options: Record<string, unknown> } {
	const options = { ...endpointOptions, ...modelOptions };
	const modelTemperature = modelOptions?.temperature;
	return {
		temperature:
			typeof modelTemperature === "number" ? modelTemperature : (userTemperature ?? undefined),
		options,
	};
}
