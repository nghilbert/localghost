import { deleteModel } from "#/shared/lib/llamacpp/client.server";
import { getRuntimeUrl } from "./discovery.server";

/** Removes an installed model's files from the user's llama.cpp instance. */
export async function removeInstalledModel({
	userId,
	model,
}: {
	userId: string;
	model: string;
}): Promise<void> {
	const url = await getRuntimeUrl(userId);
	await deleteModel({ url, model });
}
