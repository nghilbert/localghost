import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { probeEndpoint } from "#/shared/lib/llm.server";
import { getCurrentUserId } from "#/shared/lib/session.server";
import {
	fetchEndpointModels,
	findEndpoints,
	insertEndpoint,
	patchEndpoint,
	probeModelCapabilities,
	probeSavedEndpoint,
	removeEndpoint,
} from "./endpoint.server";
import {
	createEndpointSchema,
	endpointIdInput,
	listEndpointModelsInput,
	modelCapabilitiesInput,
	testEndpointInput,
	updateEndpointInput,
} from "./schemas";
import type { ModelSelection } from "./types";

/**
 * The current user's configured endpoints.
 * @returns Each endpoint with its encrypted key stripped and a `hasApiKey` flag instead.
 */
export const listEndpoints = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return findEndpoints({ ownerId: userId });
});

export const createEndpoint = createServerFn({ method: "POST" })
	.validator(createEndpointSchema)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return insertEndpoint({ ownerId: userId, data });
	});

/**
 * Patch an endpoint's fields; re-encrypts the key when `apiKey` is supplied.
 * @returns The updated endpoint, key stripped, with a `hasApiKey` flag.
 * @throws If no endpoint with that id is owned by the current user.
 */
export const updateEndpoint = createServerFn({ method: "POST" })
	.validator(updateEndpointInput)
	.handler(async ({ data: { id, data: patch } }) => {
		const userId = await getCurrentUserId();
		return patchEndpoint({ id, ownerId: userId, patch });
	});

export const deleteEndpoint = createServerFn({ method: "POST" })
	.validator(endpointIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		await removeEndpoint({ id, ownerId: userId });
	});

export const listEndpointModels = createServerFn({ method: "POST" })
	.validator(listEndpointModelsInput)
	.handler(async ({ data: { endpointId } }) => {
		const userId = await getCurrentUserId();
		return fetchEndpointModels({ endpointId, ownerId: userId });
	});

export const testEndpoint = createServerFn({ method: "POST" })
	.validator(testEndpointInput)
	.handler(async ({ data }) => {
		await getCurrentUserId();
		return probeEndpoint({ url: data.url, apiKey: data.apiKey, provider: data.provider });
	});

/** Reachability of a saved endpoint, for a status badge in Settings. */
export const checkEndpointHealth = createServerFn({ method: "POST" })
	.validator(endpointIdInput)
	.handler(async ({ data: { id } }) => {
		const userId = await getCurrentUserId();
		return probeSavedEndpoint({ endpointId: id, ownerId: userId });
	});

/** Whether a model can use tools, so the chat UI can disable the tool picker. */
export const getModelCapabilities = createServerFn({ method: "POST" })
	.validator(modelCapabilitiesInput)
	.handler(async ({ data: { endpointId, model } }) => {
		const userId = await getCurrentUserId();
		return probeModelCapabilities({ endpointId, ownerId: userId, model });
	});

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
