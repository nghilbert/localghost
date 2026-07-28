import { deleteModel } from "#/shared/lib/llamacpp/client.server";
import { getRuntimeEndpointById } from "./discovery.server";

/** Removes an installed model's files from the user's llama.cpp instance. */
export async function removeInstalledModel({
	userId,
	endpointId,
	model,
}: {
	userId: string;
	endpointId: string;
	model: string;
}): Promise<void> {
	const { url, apiKey } = await getRuntimeEndpointById({ userId, endpointId });
	await deleteModel({ url, model, apiKey });
}
