import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { authedFn } from "#/shared/lib/middleware";
import { deleteModelSetting, getModelSetting, upsertModelSetting } from "./model-setting.server";
import { modelSettingInput, upsertModelSettingInput } from "./schemas";

export const fetchModelSetting = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.validator(modelSettingInput)
	.handler(async ({ data: { endpointId, model }, context }) => {
		const setting = await getModelSetting({ endpointId, model, ownerId: context.userId });
		return setting ?? null;
	});

export const saveModelSetting = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(upsertModelSettingInput)
	.handler(async ({ data: { endpointId, model, options }, context }) => {
		await upsertModelSetting({ endpointId, model, options, ownerId: context.userId });
	});

export const resetModelSetting = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(modelSettingInput)
	.handler(async ({ data: { endpointId, model }, context }) => {
		await deleteModelSetting({ endpointId, model, ownerId: context.userId });
	});

export const modelSettingQueryOptions = ({
	endpointId,
	model,
}: {
	endpointId: string;
	model: string;
}) =>
	queryOptions({
		queryKey: ["model-setting", endpointId, model],
		queryFn: () => fetchModelSetting({ data: { endpointId, model } }),
	});
