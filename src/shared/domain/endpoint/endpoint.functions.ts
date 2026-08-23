import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { probeEndpoint } from "#/shared/lib/llm/client.server";
import { authedFn } from "#/shared/lib/middleware";
import {
	fetchEndpointModels,
	findEndpoints,
	insertEndpoint,
	patchEndpoint,
	probeModelCapabilities,
	probeSavedEndpoint,
	removeEndpoint,
} from "./endpoint.server";
import type { ModelSelection } from "./schemas";
import {
	createEndpointSchema,
	endpointIdInput,
	listEndpointModelsInput,
	modelCapabilitiesInput,
	testEndpointInput,
	updateEndpointInput,
} from "./schemas";

/**
 * The current user's configured endpoints.
 * @returns Each endpoint with its encrypted key stripped and a `hasApiKey` flag instead.
 */
export const listEndpoints = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => findEndpoints({ ownerId: context.userId }));

export const createEndpoint = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(createEndpointSchema)
	.handler(async ({ data, context }) => insertEndpoint({ ownerId: context.userId, data }));

/**
 * Patch an endpoint's fields; re-encrypts the key when `apiKey` is supplied.
 * @returns The updated endpoint, key stripped, with a `hasApiKey` flag.
 * @throws If no endpoint with that id is owned by the current user.
 */
export const updateEndpoint = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(updateEndpointInput)
	.handler(async ({ data: { id, data: patch }, context }) =>
		patchEndpoint({ id, ownerId: context.userId, patch }),
	);

export const deleteEndpoint = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(endpointIdInput)
	.handler(async ({ data: { id }, context }) => {
		await removeEndpoint({ id, ownerId: context.userId });
	});

export const listEndpointModels = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(listEndpointModelsInput)
	.handler(async ({ data: { endpointId }, context }) =>
		fetchEndpointModels({ endpointId, ownerId: context.userId }),
	);

export const testEndpoint = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(testEndpointInput)
	.handler(async ({ data }) =>
		probeEndpoint({ url: data.url, apiKey: data.apiKey, provider: data.provider }),
	);

/** Reachability of a saved endpoint, for a status badge in Settings. */
export const checkEndpointHealth = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(endpointIdInput)
	.handler(async ({ data: { id }, context }) =>
		probeSavedEndpoint({ endpointId: id, ownerId: context.userId }),
	);

/** Whether a model can use tools, so the chat UI can disable the tool picker. */
export const getModelCapabilities = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(modelCapabilitiesInput)
	.handler(async ({ data: { endpointId, model }, context }) =>
		probeModelCapabilities({ endpointId, ownerId: context.userId, model }),
	);

// ── Query options (for TanStack Query) ───────────────────────

export const endpointsQueryOptions = () =>
	queryOptions({ queryKey: ["endpoints"], queryFn: () => listEndpoints() });

export const endpointModelsQueryOptions = (endpointId: string) =>
	queryOptions({
		queryKey: ["endpoint-models", endpointId],
		queryFn: () => listEndpointModels({ data: { endpointId } }),
		staleTime: 30_000,
	});

export const endpointHealthQueryOptions = (endpointId: string) =>
	queryOptions({
		queryKey: ["endpoint-health", endpointId],
		queryFn: () => checkEndpointHealth({ data: { id: endpointId } }),
		staleTime: 5 * 60_000,
	});

export const modelCapabilitiesQueryOptions = ({ endpointId, model }: ModelSelection) =>
	queryOptions({
		queryKey: ["model-capabilities", endpointId, model],
		queryFn: () => getModelCapabilities({ data: { endpointId, model } }),
		staleTime: 5 * 60_000,
	});
