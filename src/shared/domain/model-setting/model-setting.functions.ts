import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUserId } from "#/shared/lib/session.server";
import { deleteModelSetting, getModelSetting, upsertModelSetting } from "./model-setting.server";
import { modelSettingInput, upsertModelSettingInput } from "./schemas";

export const fetchModelSetting = createServerFn({ method: "GET" })
	.validator(modelSettingInput)
	.handler(async ({ data: { endpointId, model } }) => {
		const userId = await getCurrentUserId();
		return getModelSetting({ endpointId, model, ownerId: userId }) ?? null;
	});

export const saveModelSetting = createServerFn({ method: "POST" })
	.validator(upsertModelSettingInput)
	.handler(async ({ data: { endpointId, model, options } }) => {
		const userId = await getCurrentUserId();
		await upsertModelSetting({ endpointId, model, options, ownerId: userId });
	});

export const resetModelSetting = createServerFn({ method: "POST" })
	.validator(modelSettingInput)
	.handler(async ({ data: { endpointId, model } }) => {
		const userId = await getCurrentUserId();
		await deleteModelSetting({ endpointId, model, ownerId: userId });
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
