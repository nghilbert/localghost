import { createServerFn } from "@tanstack/react-start";
import { probeEndpoint } from "#/lib/llm.server";
import { modelSelectionSchema } from "#/lib/llm-schemas";
import { authedFn } from "#/lib/middleware";
import {
	createEndpointSchema,
	endpointIdInput,
	listEndpointModelsInput,
	testEndpointInput,
	updateEndpointInput,
} from "./endpoint.schemas";
import {
	fetchEndpointModels,
	findEndpoints,
	insertEndpoint,
	patchEndpoint,
	probeModelCapabilities,
	probeSavedEndpoint,
	removeEndpoint,
} from "./server/endpoint.server";

/** The user's endpoints, each with a `hasApiKey` flag in place of the encrypted key. */
export const listEndpoints = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => findEndpoints({ ownerId: context.userId }));

/** Saves a new endpoint, encrypting its API key. */
export const createEndpoint = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(createEndpointSchema)
	.handler(async ({ data, context }) => insertEndpoint({ ownerId: context.userId, data }));

/**
 * Updates an endpoint's given fields.
 * @throws If the user does not own the endpoint.
 */
export const updateEndpoint = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(updateEndpointInput)
	.handler(async ({ data: { id, data: patch }, context }) =>
		patchEndpoint({ id, ownerId: context.userId, patch }),
	);

/** Deletes an endpoint. */
export const deleteEndpoint = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(endpointIdInput)
	.handler(async ({ data: { id }, context }) => {
		await removeEndpoint({ id, ownerId: context.userId });
	});

/** The models a saved endpoint reports. */
export const listEndpointModels = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(listEndpointModelsInput)
	.handler(async ({ data: { endpointId }, context }) =>
		fetchEndpointModels({ endpointId, ownerId: context.userId }),
	);

/** Tests an unsaved endpoint's URL and key. */
export const testEndpoint = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(testEndpointInput)
	.handler(async ({ data }) =>
		probeEndpoint({ url: data.url, apiKey: data.apiKey, provider: data.provider }),
	);

/** Whether a saved endpoint is reachable with its key. */
export const checkEndpointHealth = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(endpointIdInput)
	.handler(async ({ data: { id }, context }) =>
		probeSavedEndpoint({ endpointId: id, ownerId: context.userId }),
	);

/** Whether a model accepts tools, images, and documents. */
export const getModelCapabilities = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(modelSelectionSchema)
	.handler(async ({ data: { endpointId, model }, context }) =>
		probeModelCapabilities({ endpointId, ownerId: context.userId, model }),
	);
