import { EndpointList } from "#/features/endpoint/components/EndpointList";
import { LlamacppSettings } from "#/features/library/components/LlamacppSettings";

/** The llama.cpp connection, then the added provider endpoints. */
export function EndpointsTab() {
	return (
		<>
			<LlamacppSettings />
			<EndpointList />
		</>
	);
}
