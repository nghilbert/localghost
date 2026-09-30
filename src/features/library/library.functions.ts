import { createServerFn } from "@tanstack/react-start";
import { upsertLlamacppEndpoint } from "#/features/endpoint/server/endpoint.server";
import { downloadModel, unloadModel } from "#/lib/llamacpp/client.server";
import { llamacppConnectionSchema, llamacppUrlSchema } from "#/lib/llamacpp/url";
import { modelSelectionSchema } from "#/lib/llm-schemas";
import { authedFn } from "#/lib/middleware";
import {
	catalogModelsByIdsInput,
	catalogQuerySchema,
	modelVariantsInput,
	upsertModelSettingInput,
} from "./library.schemas";
import type { RuntimeStatus } from "./library.types";
import { getCatalogModelsByIds, getCatalogPage, listGroupVariants } from "./server/catalog.server";
import { getRuntimeEndpointById, probeRuntime, scanForRuntime } from "./server/discovery.server";
import { getHardwareInfo } from "./server/hardware.server";
import {
	deleteModelSetting,
	findModelSettings,
	getModelSetting,
	upsertModelSetting,
} from "./server/model-setting.server";
import { removeInstalledModel } from "./server/uninstall.server";

/** The host's RAM, CPU, and GPUs. */
export const getHardware = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async () => getHardwareInfo());

/** A page of the model catalog. */
export const getModelCatalog = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(catalogQuerySchema)
	.handler(async ({ data }) => getCatalogPage(data));

/** Catalog entries for the given model ids. */
export const getModelCatalogByIds = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(catalogModelsByIdsInput)
	.handler(async ({ data }) => getCatalogModelsByIds(data.ids));

/** Every quant of a model across its repos. */
export const getModelVariants = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(modelVariantsInput)
	.handler(async ({ data }) => listGroupVariants(data));

/** Finds the llama.cpp runtime, saves it as an endpoint, and reports its models and downloads. */
export const scanRuntimeStatus = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }): Promise<RuntimeStatus> => {
		const found = await scanForRuntime(context.userId);
		if (!found) {
			return {
				found: false,
				runtimeUrl: null,
				installedModels: [],
				downloads: {},
				endpointId: null,
			};
		}

		const endpointId = await upsertLlamacppEndpoint({
			ownerId: context.userId,
			url: found.url,
			existing: found.savedEndpoint,
		});
		return {
			found: true,
			runtimeUrl: found.url,
			installedModels: found.installedModels,
			downloads: found.downloads,
			endpointId,
		};
	});

/** Deletes an installed model's files. */
export const deleteModel = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(modelSelectionSchema)
	.handler(async ({ data, context }) => {
		await removeInstalledModel({
			userId: context.userId,
			endpointId: data.endpointId,
			model: data.model,
		});
	});

/** Checks a llama.cpp URL without saving it. */
export const testRemoteRuntime = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(llamacppUrlSchema)
	.handler(async ({ data }) => {
		const probe = await probeRuntime({ url: data.url });
		return { reachable: probe.reachable, modelCount: probe.installedModels.length };
	});

/** Saves a reachable llama.cpp URL as the runtime endpoint. */
export const registerRemoteRuntime = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(llamacppConnectionSchema)
	.handler(async ({ data, context }) => {
		const probe = await probeRuntime({ url: data.url });
		if (!probe.reachable) {
			throw new Error(`No llama.cpp instance is responding at ${data.url}`);
		}
		await upsertLlamacppEndpoint({ ownerId: context.userId, url: data.url });
	});

/** Starts downloading a model on the runtime. */
export const startModelDownload = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(modelSelectionSchema)
	.handler(async ({ data, context }) => {
		const resolved = await getRuntimeEndpointById({
			userId: context.userId,
			endpointId: data.endpointId,
		});
		await downloadModel({ url: resolved.url, model: data.model, apiKey: resolved.apiKey });
	});

/** Stops a model's download. */
export const cancelModelDownload = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(modelSelectionSchema)
	.handler(async ({ data, context }) => {
		const resolved = await getRuntimeEndpointById({
			userId: context.userId,
			endpointId: data.endpointId,
		});
		await unloadModel({ url: resolved.url, model: data.model, apiKey: resolved.apiKey });
	});

/** Every model the user has overrides for. */
export const getModelSettings = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => findModelSettings({ ownerId: context.userId }));

/** A model's saved overrides, or null when it has none. */
export const fetchModelSetting = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(modelSelectionSchema)
	.handler(async ({ data: { endpointId, model }, context }) => {
		const setting = await getModelSetting({ endpointId, model, ownerId: context.userId });
		return setting ?? null;
	});

/** Creates or replaces a model's overrides. */
export const saveModelSetting = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(upsertModelSettingInput)
	.handler(async ({ data: { endpointId, model, options }, context }) => {
		await upsertModelSetting({ endpointId, model, options, ownerId: context.userId });
	});

/** Deletes a model's overrides. */
export const resetModelSetting = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(modelSelectionSchema)
	.handler(async ({ data: { endpointId, model }, context }) => {
		await deleteModelSetting({ endpointId, model, ownerId: context.userId });
	});
