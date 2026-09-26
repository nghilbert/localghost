/**
 * Merges the user's temperature, the endpoint's options, and the model's options, most
 * specific first. Temperature is returned on its own, since providers take it outside `options`.
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
