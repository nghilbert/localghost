import { useMutation } from "@tanstack/react-query";
import type { z } from "zod";
import { testEndpoint } from "#/lib/endpoint/endpoint.functions";
import type { testEndpointInput } from "#/lib/endpoint/endpoint.schemas";

/** Tests an endpoint without saving it. */
export function useTestEndpoint() {
	return useMutation({
		mutationFn: (data: z.input<typeof testEndpointInput>) => testEndpoint({ data }),
	});
}
